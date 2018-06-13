var command = {
  command: 'digest',
  description: 'Show publishable information about the current project',
  builder: {},
  run: function (options, done) {
    var Config = require("truffle-config");
    var Package = require("../package");

    var config = Config.detect(options);
    Package.digest(config, function(err, results) {
      if (err) return done(err);
      options.logger.log(results);
      done();
    });
  }
}

module.exports = command;
