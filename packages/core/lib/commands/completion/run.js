module.exports = async function (options) {
  const install = require("./commands/install");
  const uninstall = require("./commands/uninstall");
  const TaskError = require("../../errors/taskerror");

  const [subCommand] = options._;
  switch (subCommand) {
    case "install":
      await install.run(options);
      break;

    case "uninstall":
      await uninstall.run(options);
      break;

    default:
      throw new TaskError();
  }
};
