const fs = require("fs");
const TruffleError = require("@truffle/error");
const {
  completionScriptName,
  locationFromShell,
  shellConfigSetting,
  shellName
} = require("../../helpers");

module.exports = async function (_) {
  const path = require("path");
  const Config = require("@truffle/config");
  const completionScript = path.resolve(
    Config.getTruffleDataDirectory(),
    completionScriptName()
  );

  try {
    writeCompletionScript(completionScript);
    appendToShellConfig(completionScript);
  } catch (err) {
    const colors = require("colors");
    const warning = colors.yellow(
      `> Will not install CLI tab-complete: ${err.message}`
    );
    console.log(warning);
  }
};

function writeCompletionScript(filePath) {
  const templates = require("./templates");
  const shell = shellName();
  let completion = templates[shell];
  if (!completion) {
    throw TruffleError(
      `Cannot create completion script for shell of type ${shell}`
    );
  }

  completion = completion.replace(/{{app_name}}/g, "truffle");
  fs.writeFileSync(
    filePath,
    completion.replace(/{{app_path}}/g, process.argv[1])
  );
}

function appendToShellConfig(filePath) {
  const scriptConfigLocation = locationFromShell();
  const linesToAdd = shellConfigSetting(filePath);
  if (!stringInFile(linesToAdd, scriptConfigLocation)) {
    fs.appendFileSync(scriptConfigLocation, linesToAdd);
  }
}

function stringInFile(string, fileName) {
  const contents = fs.readFileSync(fileName);
  return contents.includes(string);
}
