var command = {
  command: 'init',
  description: 'Initialize new Ethereum project with example contracts and tests',
  builder: {},
  run: function (options, done) {
    var Config = require("truffle-config");
    var Init = require("truffle-init");
    var OS = require("os");

    var config = Config.default().with({
      logger: console
    });

    var example_name = "default";

    if (options._ && options._.length > 0) {
      example_name = options._[0];
    }

    Init.fromGithub(config, example_name, config.working_directory).then(function(project_config) {
      var docs_url = project_config.docs_url || "https://github.com/trufflesuite/truffle-init-" + example_name;

      config.logger.log("Project initialized." +
        OS.EOL +
        OS.EOL +
        "  Documentation: " + docs_url +
        OS.EOL
      );

      project_config.commands = project_config.commands || {};

      var longest_command_length = 0;
      var command_names = Object.keys(project_config.commands);

      command_names.forEach(function(key) {
        if (key.length > longest_command_length) {
          longest_command_length = key.length;
        }
      });

      if (command_names.length > 0) {
        config.logger.log("Commands:" + OS.EOL);
      }

      command_names.forEach(function(key) {
        var spacing = "";

        while (key.length + spacing.length < longest_command_length) {
          spacing += " ";
        }

        config.logger.log("  " + key + ": " + spacing + project_config.commands[key]);
      });

      if (project_config.epilogue) {
        console.log(OS.EOL + project_config.epilogue.replace("\n", OS.EOL));
      }

      config.logger.log("");
    }).catch(done);
  }
}

module.exports = command;
