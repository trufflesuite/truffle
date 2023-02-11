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

//Subset of truffle commands that are allowed to run in console REPLS.
//Excluded commands are:
//  console, dashboard, db, develop, init and watch
const validTruffleConsoleCommands = [
  "build",
  "compile",
  "config",
  "create",
  "debug",
  "deploy",
  "exec",
  "help",
  "migrate",
  "networks",
  "obtain",
  "opcode",
  "preserve",
  "run",
  "test",
  "unbox",
  "version"
];

module.exports = {
  validTruffleCommands,
  validTruffleConsoleCommands
};
