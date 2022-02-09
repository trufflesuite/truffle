const fs = require("fs");
const OS = require("os");
const TruffleError = require("@truffle/error");
const path = require("path");

function shellName() {
  return (process.env.SHELL || "").split("/").slice(-1)[0];
}

function completionScriptName() {
  return `completion.${shellName()}`;
}

function locationFromShell() {
  const shell = shellName();
  if (shell === "zsh" || shell === "bash") {
    const osx_path = path.resolve(OS.homedir(), `.${shell}_profile`);
    const linux_path = path.resolve(OS.homedir(), `.${shell}rc`);
    return fs.existsSync(osx_path) ? osx_path : linux_path;
  } else {
    throw new TruffleError(`${shell} is not a supported shell`);
  }
}

function shellConfigSetting(filePath) {
  return (
    `${OS.EOL}# Truffle tab-complete CLI feature. Uninstall by removing this line` +
    `${OS.EOL}[ -f ${filePath} ] && . ${filePath} || true${OS.EOL}`
  );
}

module.exports = {
  completionScriptName,
  locationFromShell,
  shellConfigSetting,
  shellName
};
