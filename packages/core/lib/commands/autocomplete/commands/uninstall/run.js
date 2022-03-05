const fs = require("fs");
const OS = require("os");
const TruffleError = require("@truffle/error");
const {
  completionScriptName,
  locationFromShell,
  shellConfigSetting,
  shellName
} = require("../../helpers");

module.exports = async function (_) {
  try {
    uninstall(shellName());
  } catch (err) {
    if (err instanceof TruffleError) {
      const colors = require("colors");
      const warning = colors.yellow(
        `> Could not uninstall CLI tab-complete: ${err.message}`
      );
      console.log(warning);
    } else {
      throw err;
    }
  }
};

function uninstall(shell) {
  if (shell === "zsh") {
    removeFromZshConfig();
  } else if (shell === "bash") {
    uninstallBashCompletion();
  } else {
    throw new TruffleError(`Unrecognized shell type: ${shell}`);
  }
}

function removeFromZshConfig() {
  const path = require("path");
  const Config = require("@truffle/config");
  const completionScript = path.resolve(
    Config.getTruffleDataDirectory(),
    completionScriptName("zsh")
  );

  if (fs.existsSync(completionScript)) {
    fs.unlinkSync(completionScript);
  }

  const scriptConfigLocation = locationFromShell("zsh");
  if (!fs.existsSync(scriptConfigLocation)) {
    return;
  }

  const contents = fs.readFileSync(scriptConfigLocation, "utf8").split(/\r?\n/);
  const linesToRemove = shellConfigSetting("zsh").split(/\r?\n/);
  const newFileContents = contents.map(line =>
    linesToRemove.includes(line) ? "" : line
  );

  fs.writeFileSync(scriptConfigLocation, newFileContents.join(OS.EOL).trim());
}

function uninstallBashCompletion() {
  const completionPath = completionScriptName("bash");
  fs.unlinkSync(completionPath);
}
