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

  writeCompletionScript(completionScript);

  try {
    appendToShellConfig(completionScript);
  } catch (err) {
    if (err instanceof TruffleError) {
      const colors = require("colors");
      const warning = colors.yellow(
        `> Will not install CLI tab-complete: ${err.message}`
      );
      console.log(warning);
    } else {
      throw err;
    }
  }
};

function writeCompletionScript(filePath) {
  if (fs.existsSync(filePath)) {
    return;
  }

  // Monkey patch console.log. Done for two reasons:
  //   1. To capture completion script from yargs (no other way)
  //   2. To prevent it from printing to stdout during installation
  let content;
  const origFuncHandle = global.console.log;
  global.console.log = args => {
    content = args;
  };
  require("yargs/yargs")().showCompletionScript();
  global.console.log.apply = origFuncHandle;
  fs.writeFileSync(filePath, content);
}

function appendToShellConfig(filePath) {
  const scriptConfigLocation = locationFromShell();
  const linesToAdd = shellConfigSetting(filePath);
  if (stringInFile(linesToAdd, scriptConfigLocation)) {
    return;
  }

  fs.appendFileSync(scriptConfigLocation, linesToAdd);
}

function stringInFile(string, fileName) {
  const contents = fs.readFileSync(fileName);
  return contents.includes(string);
}
