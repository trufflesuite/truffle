var command = {
  command: "init",
  description: "Initialize new and empty Ethereum project",
  builder: {},
  help: {
    usage: "truffle init [--force]",
    options: [
      {
        option: "--force",
        description:
          "Initialize project in the current directory regardless of its " +
          "state. Be careful, this\n                    will potentially overwrite files " +
          "that exist in the directory."
      }
    ]
  },
  run: function(options, done) {
    var Config = require("truffle-config");
    var OS = require("os");
    var UnboxCommand = require("./unbox");

    var config = Config.default().with({
      logger: console
    });

    if (options._ && options._.length > 0) {
      config.logger.log(
        "Error: `truffle init` no longer accepts a project template name as an argument."
      );
      config.logger.log();
      config.logger.log(
        " - For an empty project, use `truffle init` with no arguments" +
          OS.EOL +
          " - Or, browse the Truffle Boxes at <http://truffleframework.com/boxes>!"
      );
      process.exit(1);
    }

    // defer to `truffle unbox` command with "bare" box as arg
    var url = "https://github.com/truffle-box/bare-box.git";
    options._ = [url];

    UnboxCommand.run(options, done);
  }
};

module.exports = command;
