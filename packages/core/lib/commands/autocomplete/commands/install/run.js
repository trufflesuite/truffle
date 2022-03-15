const fs = require("fs");
const TruffleError = require("@truffle/error");
const OS = require("os");
const path = require("path");
const {
  completionScriptPath,
  locationFromShell,
  shellName,
  zshCompletionSetting
} = require("../../helpers");

module.exports = async function (_) {
  const shell = shellName();
  try {
    writeCompletionScript(shell);
  } catch (err) {
    const colors = require("colors");
    const warning = colors.yellow(
      `> Will not install CLI tab-complete: ${err.message}`
    );
    console.log(warning);
  }
};

function writeCompletionScript(shell) {
  const templates = require("./templates");

  switch (shell) {
    case "zsh":
      writeZshCompletion(templates[shell]);
      break;
    case "bash":
      writeBashCompletion(templates[shell]);
      break;
    default:
      throw new TruffleError(
        `Cannot create completion script for shell of type ${shell}`
      );
  }
}

function writeZshCompletion(template) {
  const completionScript = completionScriptPath("zsh");
  fs.writeFileSync(completionScript, fillTemplate(template));

  const scriptConfigLocation = locationFromShell("zsh");
  const linesToAdd = zshCompletionSetting();
  if (!stringInFile(linesToAdd, scriptConfigLocation)) {
    fs.appendFileSync(scriptConfigLocation, linesToAdd);
  }
}

function stringInFile(string, fileName) {
  let contents = "";
  try {
    contents = fs.readFileSync(fileName);
  } catch (err) {
    // Handle error silently - will return false
  }

  return contents.includes(string);
}

function writeBashCompletion(template) {
  const localShare = path.resolve(OS.homedir(), ".local/share");
  fs.accessSync(localShare, fs.constants.W_OK);

  const completionPath = completionScriptPath("bash");
  fs.mkdirSync(path.dirname(completionPath), { recursive: true });
  fs.writeFileSync(completionPath, fillTemplate(template));
}

function fillTemplate(template) {
  const completion = template.replace(/{{app_name}}/g, "truffle");
  return completion.replace(/{{app_path}}/g, process.argv[1]);
}
