module.exports = async function (options) {
  const shell = require("./commands/shell");
  const [subCommand] = options._;
  await shell(subCommand).run(options);
};
