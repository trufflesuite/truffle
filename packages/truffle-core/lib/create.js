var util = require("./util");
var file = require("./file");
var path = require("path");

var templates = {
  test: {
    filename: path.join(__dirname, "../", "templates", "example.js"),
    variable: "example"
  },
  contract: {
    filename: path.join(__dirname, "../", "templates", "Example.sol"),
    name: "Example",
    variable: "example"
  }
};

var Create = {
  contract: function(directory, name, callback) {
    var from = templates.contract.filename;
    var to = path.join(directory, name + ".sol");

    file.duplicate(from, to, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      file.replace(to, templates.contract.name, name, callback);
    });
  },
  test: function(directory, name, callback) {
    var underscored = util.toUnderscoreFromCamel(name);
    var from = templates.test.filename;
    var to = path.join(directory, underscored + ".js");

    file.duplicate(from, to, function(err) {
      if (err != null) {
        callback(err);
        return;
      }

      file.replace(to, templates.contract.name, name, function() {
        file.replace(to, templates.contract.variable, underscored, callback);
      });
    });
  }
}

module.exports = Create
