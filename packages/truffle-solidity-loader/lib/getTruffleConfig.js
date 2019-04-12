const findUp = require("find-up");
const Logger = require("./logDecorator");

const DEFAULT_CONFIG_FILENAME = "truffle-config.js";
const BACKUP_CONFIG_FILENAME = "truffle.js";

const getTruffleConfig = () => {
  const isWin = /^win/.test(process.platform);
  const defaultConfig = findUp.sync(DEFAULT_CONFIG_FILENAME);
  const backupConfig = findUp.sync(BACKUP_CONFIG_FILENAME);
  let configFile;

  if (defaultConfig && backupConfig) {
    Logger.log(
      `Warning: Both ${DEFAULT_CONFIG_FILENAME} and ${BACKUP_CONFIG_FILENAME} were found. Using ${DEFAULT_CONFIG_FILENAME}.`
    );
    configFile = defaultConfig;
  } else if (backupConfig && !defaultConfig) {
    if (isWin)
      Logger.log(
        `Warning: Please rename ${BACKUP_CONFIG_FILENAME} to ${DEFAULT_CONFIG_FILENAME} to ensure Windows compatibility.`
      );
    configFile = backupConfig;
  } else {
    configFile = defaultConfig;
  }

  if (configFile) return configFile;

  return false;
};

module.exports = getTruffleConfig;
