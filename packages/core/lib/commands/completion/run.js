const OS = require("os");
const fs = require("fs");
const path = require("path");

module.exports = async _ => {
  const Config = require("@truffle/config");
  const completionScript = path.resolve(
    Config.getTruffleDataDirectory(),
    completionScriptName()
  );

  writeCompletionScript(completionScript);
  appendToShellConfig(completionScript);

  // TODO: handle for other shells
  // TODO: handle for other OS's (bash_profile instead of bashrc)
  // TODO: Uninstall
  // TODO: make faster
};

function shellName() {
  return (process.env.SHELL || "").split("/").slice(-1)[0];
}

function completionScriptName() {
  return `completion.${shellName()}`;
}

function locationFromShell() {
  // const shell = shellName();
  // console.log(`Shell name: ${shell}`);
  // if (shell === 'zsh') {
  //   return path.resolve(OS.homedir(), '.zshrc');

  // } else if (shell === 'fish') {
  //   return path.resolve(
  //     OS.homedir(), '~/.config/fish/config.fish'
  //   );

  // } else {
  return path.resolve(OS.homedir(), ".bashrc");
  // }
}

function writeCompletionScript(filePath) {
  if (fs.existsSync(filePath)) {
    return;
  }

  // Monkey patch console.log. Done for two reasons:
  //   1. To capture completion script from yargs (no other way)
  //   2. To prevent it from printing to stdout during installation
  let content;
  const origFuncHandle = global.console.log.apply;
  global.console.log.apply = (thisArg, args) => {
    content = args.join("");
  };
  require("yargs/yargs")().showCompletionScript();
  global.console.log.apply = origFuncHandle;
  fs.writeFileSync(filePath, content);
}

function appendToShellConfig(filePath) {
  const linesToAdd =
    `\n# Truffle tab-complete CLI feature` +
    `\n# Uninstall by removing these lines` +
    `\n[ -f ${filePath} ] && . ${filePath} || true`;

  const scriptConfigLocation = locationFromShell();
  if (stringInFile(linesToAdd, scriptConfigLocation)) {
    return;
  }

  fs.appendFileSync(scriptConfigLocation, linesToAdd);
}

function stringInFile(string, fileName) {
  const contents = fs.readFileSync(fileName);
  return contents.includes(string);
}
