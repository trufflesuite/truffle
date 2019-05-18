const tmp = require("tmp");
const fs = require("fs-extra");
const config = require("truffle-config");
const path = require("path");

module.exports = {
  copyDirectory(source, dest) {
    return new Promise((accept, reject) => {
      fs.copy(source, dest, err => {
        err ? reject(err) : accept();
      });
    });
  },

  create(source, subPath = "") {
    const self = this;

    return new Promise((resolve, reject) => {
      if (!fs.existsSync(source))
        return reject(`Sandbox failed: source: ${source} does not exist`);

      try {
        const tempDir = tmp.dirSync({ unsafeCleanup: true });
        self
          .copyDirectory(source, tempDir.name)
          .then(() => {
            const conf = config.load(
              path.join(tempDir.name, subPath, "truffle-config.js"),
              {}
            );
            resolve(conf);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  },

  load(source) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(source))
        return reject(`Sandbox failed: source: ${source} does not exist`);

      const conf = config.load(path.join(source, "truffle-config.js"), {});
      resolve(conf);
    });
  }
};
