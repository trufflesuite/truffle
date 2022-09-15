import Config from "@truffle/config";
import * as expect from "@truffle/expect";
import { Resolver } from "@truffle/resolver";
import Artifactor from "@truffle/artifactor";

export function prepareConfig(options: Config) {
  expect.options(options, ["contracts_build_directory"]);

  expect.one(options, ["contracts_directory", "files"]);

  // Use a config object to ensure we get the default sources.
  const config = Config.default().merge(options);

  config.compilersInfo = {};

  if (!config.resolver) config.resolver = new Resolver(config);

  if (!config.artifactor) {
    config.artifactor = new Artifactor(config.contracts_build_directory);
  }

  return config;
}

export function multiPromisify(func) {
  return (...args) =>
    new Promise((accept, reject) => {
      const callback = (err, ...results) => {
        if (err) reject(err);

        accept(results);
      };

      func(...args, callback);
    });
}
