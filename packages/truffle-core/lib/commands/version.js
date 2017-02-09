var command = {
  command: 'version',
  description: 'Show version number and exit',
  builder: {},
  run: function (options, done) {
    var pkg = require("../../package.json");

    options.logger.log("Truffle v" + pkg.version);
    done();
  }
}

module.exports = command;
