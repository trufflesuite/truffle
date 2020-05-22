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
    const UnboxCommand = require("./unbox");
    const fse = require("fs-extra");
    let inputPath;
    if (options._ && options._.length > 0) {
      inputPath = options._[0];
      fse.ensureDirSync(inputPath);
    }

    // defer to `truffle unbox` command with "bare" box as arg
    const url = "https://github.com/truffle-box/bare-box.git";
    options._ = [url, inputPath];

    UnboxCommand.run(options, done);
  }
};

module.exports = command;
