import fse from "fs-extra";

function setDefaults(config: any = {}) {
  const hooks = config.hooks || {};

  return {
    ignore: config.ignore || [],
    commands: config.commands || {
      compile: "truffle compile",
      migrate: "truffle migrate",
      test: "truffle test"
    },
    hooks: {
      "post-unpack": hooks["post-unpack"] || ""
    }
  };
}

function read(path: string) {
  return fse
    .readFile(path)
    .catch(() => "{}")
    .then(JSON.parse)
    .then(setDefaults);
}

export default {
  read,
  setDefaults
};
