const command = {
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
          "that exist in the directory.",
      },
    ],
  },
  run: function (options, done) {
    const { copyFiles } = require("./copyFiles");
    const fse = require("fs-extra");
    const Config = require("@truffle/config");
    const config = Config.default();

    let destinationPath;
    if (options._ && options._.length > 0) {
      destinationPath = options._[0];
      fse.ensureDirSync(destinationPath);
    } else {
      destinationPath = config.working_directory;
    }

    copyFiles(destinationPath, config)
      .then(() => {
        done();
      })
      .catch(done);
  },
};

module.exports = command;
