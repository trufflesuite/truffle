const OS = require("os");
const path = require("path");
const fse = require("fs-extra");
const Conf = require("conf");

module.exports = {
  oldTruffleFolder: path.join(OS.homedir(), ".config", "truffle"),

  needsMigrated: function () {
    const oldConfig = path.join(this.oldTruffleFolder, "config.json");
    const conf = new Conf({ projectName: "truffle" });
    return fse.existsSync(oldConfig) && oldConfig !== conf.path;
  },

  migrate: function () {
    if (!this.needsMigrated) return;
    this.migrateDataDir();
  },

  migrateDataDir: function () {
    const conf = new Conf({ projectName: "truffle" });
    const oldSettings = require(path.join(
      this.oldTruffleFolder,
      "config.json"
    ));
    for (const key in oldSettings) {
      conf.set(key, oldSettings[key]);
    }
  }
};
