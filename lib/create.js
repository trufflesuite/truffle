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
  },
  migration: {
    filename: path.join(__dirname, "../", "templates", "migration.js"),
  }
};

var Create = {
  contract: function(directory, name, callback) {
    var from = templates.contract.filename;
    var to = path.join(directory, name + ".sol");

    file.duplicate(from, to, function(err) {
      if (err) return callback(err);

      file.replace(to, templates.contract.name, name, callback);
    });
  },
  test: function(directory, name, callback) {
    var underscored = util.toUnderscoreFromCamel(name);
    underscored = underscored.replace(/\./g, "_");
    var from = templates.test.filename;
    var to = path.join(directory, underscored + ".js");

    file.duplicate(from, to, function(err) {
      if (err) return callback(err);

      file.replace(to, templates.contract.name, name, function() {
        file.replace(to, templates.contract.variable, underscored, callback);
      });
    });
  },
  migration: function(directory, name, callback) {
    var underscored = util.toUnderscoreFromCamel(name || "");
    underscored = underscored.replace(/\./g, "_");
    var from = templates.migration.filename;
    var to = new Date().getTime() / 1000 | 0; // Only do seconds.

    if (name != null && name != "") {
      to += "_" + underscored;
    }

    to += ".js";
    to = path.join(directory, to);

    file.duplicate(from, to, callback);
  }
}

module.exports = Create
