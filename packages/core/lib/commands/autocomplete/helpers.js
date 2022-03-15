const fs = require("fs");
const OS = require("os");
const TruffleError = require("@truffle/error");
const path = require("path");

function shellName() {
  return (process.env.SHELL || "").split("/").slice(-1)[0];
}

function completionScriptPath(shell) {
  switch (shell) {
    case "zsh":
      const Config = require("@truffle/config");
      const scriptName = `completion.${shell}`;
      return path.resolve(Config.getTruffleDataDirectory(), scriptName);

    case "bash":
      return path.resolve(
        OS.homedir(),
        ".local/share/bash-completion/completions/truffle"
      );

    default:
      throw new TruffleError(
        `Cannot create completion script for shell of type ${shell}`
      );
  }
}

function locationFromShell(shell) {
  switch (shell) {
    case "zsh":
      const osx_path = path.resolve(OS.homedir(), `.${shell}_profile`);
      const linux_path = path.resolve(OS.homedir(), `.${shell}rc`);
      return fs.existsSync(osx_path) ? osx_path : linux_path;
    case "bash":
      return path.resolve(OS.homedir(), `.${shell}_completion`);
    default:
      throw new TruffleError(`${shell} is not a supported shell`);
  }
}

function zshCompletionSetting() {
  const completionScript = completionScriptPath("zsh");
  return (
    `${OS.EOL}# Truffle tab-complete CLI feature. Uninstall by removing this line` +
    `${OS.EOL}. ${completionScript}`
  );
}

module.exports = {
  completionScriptPath,
  locationFromShell,
  shellName,
  zshCompletionSetting
};
