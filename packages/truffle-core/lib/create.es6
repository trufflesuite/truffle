var util = require("./util");
var file = require("./file");

var Create = {
  contract(config, name, callback) {
    config.expect(config.contracts.directory, "contracts directory");

    var from = config.example.contract.filename;
    var to = `${config.contracts.directory}/${name}.sol`;

    file.duplicate(from, to, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      file.replace(to, config.example.contract.name, name, callback);
    });
  },
  test(config, name, callback) {
    config.expect(config.tests.directory, "tests directory");

    var underscored = util.toUnderscoreFromCamel(name);
    var from = config.example.test.filename;
    var to = `${config.tests.directory}/${underscored}.js`;

    file.duplicate(from, to, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      file.replace(to, config.example.contract.name, name, function() {
        file.replace(to, config.example.contract.variable, underscored, callback);
      });
    });
  }
}

module.exports = Create
