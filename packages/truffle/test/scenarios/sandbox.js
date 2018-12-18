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

      tmp.dir((err, dir) => {
        if (err) return reject(err);

        self
          .copyDirectory(source, dir)
          .then(() => {
            const conf = config.load(path.join(dir, subPath, "truffle.js"), {});
            resolve(conf);
          })
          .catch(reject);
      });
    });
  },

  load(source) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(source))
        return reject(`Sandbox failed: source: ${source} does not exist`);

      const conf = config.load(path.join(source, "truffle.js"), {});
      resolve(conf);
    });
  }
};
