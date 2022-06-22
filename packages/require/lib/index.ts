import path from "path";
import TruffleConfig from "@truffle/config";
import { options as expectOptions } from "@truffle/expect";
import { Web3Shim, createInterfaceAdapter } from "@truffle/interface-adapter";

import vm from "vm";
import Module from "module";

import originalRequire from "original-require";

import { ExecOptions, RequireOptions } from "./types";
import { compile } from "./typescript";

import Debug from "debug";

const debug = Debug("@truffle/require:index");

export function file(options: RequireOptions) {
  const sourceFilePath = path.resolve(options.file);

  expectOptions(options, ["file"]);

  const conf = TruffleConfig.default().with(options);

  const scriptModule = new Module(sourceFilePath);

  // Provides a subset of the globals listed here: https://nodejs.org/api/globals.html
  const sandbox: { [index: string]: any } = {
    __filename: path.basename(sourceFilePath),
    __dirname: path.dirname(sourceFilePath),
    Buffer,
    clearImmediate,
    clearInterval,
    clearTimeout,
    console,
    exports: scriptModule.exports,
    global,
    process,
    setImmediate,
    setInterval,
    setTimeout,
    module: scriptModule,
    config: conf,
    artifacts: conf.resolver,
    require: (id: string) => {
      // Ugh. Simulate a full require function for the file.
      id = id.trim();

      // If absolute, just require.
      if (path.isAbsolute(id)) {
        debug("absolute", id);
        return originalRequire(id);
      }

      // If relative, it's relative to the file.
      if (id[0] === ".") {
        const modulePath = path.join(path.dirname(sourceFilePath), id);
        debug("relative", id, modulePath);
        return originalRequire(modulePath);
      } else {
        // Not absolute, not relative, must be a globally or locally installed module.
        // Try local first.
        // Here we have to require from the node_modules directory directly.

        var moduleDir = conf.working_directory;
        while (true) {
          const modulePath = path.join(moduleDir, "node_modules", id);
          try {
            debug("local/global", id, modulePath);
            return originalRequire(modulePath);
          } catch (e) {
            debug("local/global", id, modulePath, "failed");
          }
          var oldModuleDir = moduleDir;
          moduleDir = path.dirname(moduleDir);
          if (moduleDir === oldModuleDir) break;
        }

        debug("local/global", id, "not found");

        // Try global, and let the error throw.
        return originalRequire(id);
      }
    }
  };

  // Now add contract names.
  Object.keys(conf.context || {}).forEach(key => {
    sandbox[key] = conf.context[key];
  });

  const context = vm.createContext(sandbox);

  const old_cwd = process.cwd();
  const cwd = path.dirname(sourceFilePath);
  process.chdir(cwd);

  const source = compile(conf, sourceFilePath);

  const script = new vm.Script(source, { filename: sourceFilePath });

  script.runInContext(context);
  scriptModule.loaded = true;

  const returnValue = scriptModule.exports.default ?? scriptModule.exports;

  process.chdir(old_cwd);

  return returnValue;
}

export function exec(options: ExecOptions, done: (...args: any[]) => void) {
  expectOptions(options, [
    "contracts_build_directory",
    "file",
    "resolver",
    "provider",
    "network",
    "networks",
    "network_id"
  ]);

  const interfaceAdapter = createInterfaceAdapter({
    provider: options.provider,
    networkType: options.networks[options.network].type
  });
  const web3 = new Web3Shim({
    provider: options.provider,
    networkType: options.networks[options.network].type
  });

  try {
    const fn = file({
      file: options.file,
      context: { web3, interfaceAdapter },
      resolver: options.resolver,
      config: options
    });
    fn(done);
  } catch (error) {
    done(error);
  }
}
