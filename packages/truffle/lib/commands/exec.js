var Config = require("../config");
var ConfigurationError = require("../errors/configurationerror");
var Require = require("truffle-require");

var command = {
  command: 'exec',
  description: 'Execute a JS module within Truffle environment',
  builder: {
    file: {
      type: "string"
    }
  },
  run: function (options, done) {
    var config = Config.detect(options);

    var file = options.file;

    if (file == null && options._.length > 0) {
      file = options._[0];
    }

    if (file == null) {
      done(new ConfigurationError("Please specify a file, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished."));
      return;
    }

    if (path.isAbsolute(file) == false) {
      file = path.join(process.cwd(), file);
    }

    Truffle.require.exec(config.with({
      file: file
    }), done);
  }
}

module.exports = command;
