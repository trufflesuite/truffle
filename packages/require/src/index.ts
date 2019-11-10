import * as fs from "fs";
import * as path from "path";
import Module from "module";
import * as vm from "vm";
import { Provider } from "@truffle/provider";
import originalRequire from "original-require";
import expect from "expect";
import Config from "@truffle/config";
import { Web3Shim, InterfaceAdapter } from "@truffle/interface-adapter";

export interface IOptions {
  file: any;
  contracts_build_directory: any;
  resolver: any;
  provider: Provider;
  network: any;
  network_id: any;
  context: any;
  networks: any;
}

const Require = {
  file: (options: IOptions): any => {
    let source;
    const file = options.file;

    expect.options(options, ["file"]);

    options = Config.default().with(options);

    source = fs.readFileSync(options.file, { encoding: "utf8" });

    // Modified from here: https://gist.github.com/anatoliychakkaev/1599423
    const m = new Module(file);

    // Provide all the globals listed here: https://nodejs.org/api/globals.html
    const context = {
      Buffer: Buffer,
      __dirname: path.dirname(file),
      __filename: file,
      clearImmediate: clearImmediate,
      clearInterval: clearInterval,
      clearTimeout: clearTimeout,
      console: console,
      exports: exports,
      global: global,
      module: m,
      process: process,
      require: pkgPath => {
        // Ugh. Simulate a full require function for the file.
        pkgPath = pkgPath.trim();

        // If absolute, just require.
        if (path.isAbsolute(pkgPath)) return originalRequire(pkgPath);

        // If relative, it's relative to the file.
        if (pkgPath[0] === ".") {
          return originalRequire(path.join(path.dirname(file), pkgPath));
        } else {
          // Not absolute, not relative, must be a globally or locally installed module.
          // Try local first.
          // Here we have to require from the node_modules directory directly.

          var moduleDir = path.dirname(file);
          while (true) {
            try {
              return originalRequire(
                path.join(moduleDir, "node_modules", pkgPath)
              );
            } catch (e) {}
            var oldModuleDir = moduleDir;
            moduleDir = path.join(moduleDir, "..");
            if (moduleDir === oldModuleDir) break;
          }

          // Try global, and let the error throw.
          return originalRequire(pkgPath);
        }
      },
      artifacts: options.resolver,
      setImmediate: setImmediate,
      setInterval: setInterval,
      setTimeout: setTimeout
    };

    // Now add contract names.
    Object.keys(options.context || {}).forEach(key => {
      context[key] = options.context[key];
    });

    const old_cwd = process.cwd();

    process.chdir(path.dirname(file));

    const script = new vm.Script(source, file);
    script.runInNewContext(context);

    process.chdir(old_cwd);

    return m.exports;
  },

  exec: (options: IOptions, done: (error: Error) => void): void => {
    expect.options(options, [
      "contracts_build_directory",
      "file",
      "resolver",
      "provider",
      "network",
      "network_id"
    ]);

    const interfaceAdapter = new InterfaceAdapter({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
    const web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });

    try {
      const fn = this.file({
        file: options.file,
        context: { web3, interfaceAdapter },
        resolver: options.resolver
      });
      fn(done);
    } catch (error) {
      done(error);
    }
  }
};

export default Require;
