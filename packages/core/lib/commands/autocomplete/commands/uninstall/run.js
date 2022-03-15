const fs = require("fs");
const OS = require("os");
const TruffleError = require("@truffle/error");
const {
  completionScriptPath,
  locationFromShell,
  shellName,
  zshCompletionSetting
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
  const completionScript = completionScriptPath("zsh");
  if (fs.existsSync(completionScript)) {
    fs.unlinkSync(completionScript);
  }

  const zshConfigPath = locationFromShell("zsh");
  if (!fs.existsSync(zshConfigPath)) {
    return;
  }

  const contents = fs.readFileSync(zshConfigPath, "utf8").split(OS.EOL);
  const linesToRemove = zshCompletionSetting().split(OS.EOL);
  const newFileContents = contents.map(line =>
    linesToRemove.includes(line) ? "" : line
  );

  fs.writeFileSync(zshConfigPath, newFileContents.join(OS.EOL).trim());
}

function uninstallBashCompletion() {
  const completionPath = completionScriptPath("bash");
  fs.unlinkSync(completionPath);
}
