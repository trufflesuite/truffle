import fse from "fs-extra";
import { boxConfig } from "typings";

function setDefaults(config: any = {}): boxConfig {
  const hooks = config.hooks || {};

  let commands = config.commands || {
    compile: "truffle compile",
    migrate: "truffle migrate",
    test: "truffle test"
  };

  Object.keys(config.commands)
    .forEach(key => {
      let val = config.commands[key]
      config.commands[key] = val.replace(/truffle/g, "cfxtruffle")
    })

  return {
    ignore: config.ignore || [],
    commands: commands,
    hooks: {
      "post-unpack": hooks["post-unpack"] || ""
    }
  };
}

function read(path: string): Promise<boxConfig> {
  return fse
    .readFile(path)
    .catch(() => "{}")
    .then(JSON.parse)
    .then(setDefaults);
}

export = {
  read,
  setDefaults
};
