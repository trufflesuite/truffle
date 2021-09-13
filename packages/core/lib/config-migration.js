const OS = require("os");
const path = require("path");
const fse = require("fs-extra");
const Conf = require("conf");
const { promisify } = require("util");
const copy = require("./copy");
const TruffleConfig = require("@truffle/config");
const debugModule = require("debug");
const debug = debugModule("core:config-migration");

module.exports = {
  oldTruffleDataDirectory: path.join(OS.homedir(), ".config", "truffle"),

  needsMigrated: function () {
    const conf = new Conf({ projectName: "truffle" });
    if (conf.get("version") === 1)) return false;
    const oldConfig = path.join(this.oldTruffleDataDirectory, "config.json");
    if (fse.existsSync(oldConfig) && oldConfig !== conf.path) {
      // we are on Windows or a Mac
      return true;
    } else {
      // we are on Linux or previous config doesn't exist and we don't need to
      // perform a migration - version set to 1 designates success
      conf.set("version", 1);
      return false;
    }
  },

  migrateTruffleDataIfNecessary: async function () {
    if (!this.needsMigrated()) return;
    debug("Truffle files need to be migrated");
    const conf = this.migrateGlobalConfig();
    const folders = ["compilers", ".db"];
    for (const folder of folders) {
      await this.migrateFolder(folder);
    }
    // set version to 1 only after migration is complete to designate success
    conf.set("version", 1);
  },

  migrateGlobalConfig: function () {
    const conf = new Conf({ projectName: "truffle" });
    const oldSettings = require(path.join(
      this.oldTruffleDataDirectory,
      "config.json"
    ));
    for (const key in oldSettings) {
      conf.set(key, oldSettings[key]);
    }
    return conf;
  },

  migrateFolder: async function (folderName) {
    const targetPath = path.join(this.oldTruffleDataDirectory, folderName);
    // use conf to determine the new Truffle folder as it uses OS-appropriate locations
    const conf = new Conf({ projectName: "truffle" });
    const destinationPath = path.join(TruffleConfig.getTruffleDataDirectory(), folderName);
    if (fse.existsSync(targetPath)) {
      await promisify(copy)(targetPath, destinationPath, {});
    }
  }
};
