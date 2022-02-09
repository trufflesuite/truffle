const fs = require("fs");
const TruffleError = require("@truffle/error");
const {
  completionScriptName,
  locationFromShell,
  shellConfigSetting
} = require("../../helpers");

module.exports = async function (_) {
  const path = require("path");
  const Config = require("@truffle/config");
  const completionScript = path.resolve(
    Config.getTruffleDataDirectory(),
    completionScriptName()
  );

  if (fs.existsSync(completionScript)) {
    fs.unlinkSync(completionScript);
  }

  try {
    removeFromShellConfig(completionScript);
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

function removeFromShellConfig(filePath) {
  const scriptConfigLocation = locationFromShell();
  if (!fs.existsSync(scriptConfigLocation)) {
    return;
  }

  const contents = fs.readFileSync(scriptConfigLocation, "utf8").split(/\r?\n/);
  const linesToRemove = shellConfigSetting(filePath).split(/\r?\n/);
  const newFileContents = contents.map(line =>
    linesToRemove.includes(line) ? "" : line
  );

  fs.writeFileSync(scriptConfigLocation, newFileContents.join("\n").trim());
}
