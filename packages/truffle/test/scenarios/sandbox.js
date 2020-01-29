const tmp = require("tmp");
const fse = require("fs-extra");
const Config = require("@truffle/config");
const path = require("path");

module.exports = {
  copyDirectory(source, dest) {
    return new Promise((accept, reject) => {
      fse.copy(source, dest, err => {
        err ? reject(err) : accept();
      });
    });
  },

  create(source, subPath = "") {
    const self = this;

    return new Promise((resolve, reject) => {
      if (!fse.existsSync(source))
        return reject(`Sandbox failed: source: ${source} does not exist`);

      try {
        const tempDir = tmp.dirSync({ unsafeCleanup: true });
        self
          .copyDirectory(source, tempDir.name)
          .then(() => {
            const config = Config.load(
              path.join(tempDir.name, subPath, "truffle-config.js"),
              {}
            );
            resolve(config);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  },

  load(source) {
    return new Promise((resolve, reject) => {
      if (!fse.existsSync(source))
        return reject(`Sandbox failed: source: ${source} does not exist`);

      const config = Config.load(path.join(source, "truffle-config.js"), {});
      resolve(config);
    });
  }
};
