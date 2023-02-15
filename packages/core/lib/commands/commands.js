const validTruffleCommands = [
  "build",
  "compile",
  "config",
  "console",
  "create",
  "dashboard",
  "db",
  "debug",
  "deploy",
  "develop",
  "exec",
  "help",
  "init",
  "install", // removed/deprecated
  "migrate",
  "networks",
  "obtain",
  "opcode",
  "preserve",
  "publish", // removed/deprecated
  "run",
  "test",
  "unbox",
  "version",
  "watch"
];

//List of truffle commands that are excluded from the console REPLS.
const excludedTruffleConsoleCommands = [
  "console",
  "dashboard",
  "db",
  "develop",
  "init",
  "watch"
];

const validTruffleConsoleCommands = validTruffleCommands.filter(
  command => !excludedTruffleConsoleCommands.includes(command)
);

module.exports = {
  excludedTruffleConsoleCommands,
  validTruffleCommands,
  validTruffleConsoleCommands
};
