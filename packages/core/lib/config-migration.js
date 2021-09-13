const OS = require("os");
const path = require("path");
const fse = require("fs-extra");
const Conf = require("conf");
const { promisify } = require("util");
const copy = require("./copy");
const TruffleConfig = require("@truffle/config");
const debugModule = require("debug");
const debug = debugModule("core:config-migration");

const CURRENT_CONFIG_VERSION = 1;

module.exports = {
  oldTruffleDataDirectory: path.join(OS.homedir(), ".config", "truffle"),

  needsMigrated: function () {
    const conf = new Conf({ projectName: "truffle" });
    if (conf.get("version") === CURRENT_CONFIG_VERSION) return false;
    const oldConfig = path.join(this.oldTruffleDataDirectory, "config.json");
    if (fse.existsSync(oldConfig) && oldConfig !== conf.path) {
      // we are on Windows or a Mac
      return true;
    } else {
      // we are on Linux or previous config doesn't exist and we don't need to
      // perform a migration - current version set to designates success
      conf.set("version", CURRENT_CONFIG_VERSION);
      return false;
    }
  },

  migrateTruffleDataIfNecessary: async function () {
    if (!this.needsMigrated()) return;
    debug("Truffle files need to be migrated");
    const conf = this.migrateGlobalConfig();
    debug("successfully migrated global config");
    const folders = ["compilers", ".db"];
    for (const folder of folders) {
      await this.migrateFolder(folder);
      debug("successfully migrated folder: %o", folder);
    }
    // set version to current only after migration is complete to designate success
    conf.set("version", CURRENT_CONFIG_VERSION);
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
