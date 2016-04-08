var util = require("./util");
var file = require("./file");
var path = require("path");

var Create = {
  contract: function(config, name, callback) {
    if (!config.expect(config.contracts.directory, "contracts directory", callback)) {
      return;
    }

    var from = config.templates.contract.filename;
    var to = path.join(config.contracts.directory, name + ".sol");

    file.duplicate(from, to, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      file.replace(to, config.templates.contract.name, name, callback);
    });
  },
  test: function(config, name, callback) {
    if (!config.expect(config.tests.directory, "tests directory", callback)) {
      return;
    }

    var underscored = util.toUnderscoreFromCamel(name);
    var from = config.templates.test.filename;
    var to = path.join(config.tests.directory, underscored + ".js");

    file.duplicate(from, to, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      file.replace(to, config.templates.contract.name, name, function() {
        file.replace(to, config.templates.contract.variable, underscored, callback);
      });
    });
  }
}

module.exports = Create
