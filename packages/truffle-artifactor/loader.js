var fs = require("fs");
var path = require("path");
var dir = require("node-dir");

var PuddingLoader = {
  contract_data: function(source_directory, callback) {
    if (!fs.existsSync(source_directory)) {
      throw new Error("Source directory " + source_directory + " doesn't exist!");
    }

    dir.files(source_directory, function(err, files) {
      if (err != null) {
        callback(err);
        return;
      }

      var found = [];

      for (var file of files) {
        if (path.basename(file).indexOf(".sol.js") > 0) {
          var class_name = path.basename(file, ".sol.js");
          found.push({
            name: class_name,
            file: file,
            code: fs.readFileSync(file, {encoding: "utf8"}) + ";\n\n"
          });
        }
      }

      callback(null, found);
    });
  },

  load: function(source_directory, Pudding, scope, callback) {
    if (!fs.existsSync(source_directory)) {
      throw new Error("Source directory " + source_directory + " doesn't exist!");
    }

    PuddingLoader.contract_data(source_directory, function(err, contracts) {
      if (err) return callback(err);

      var factories = [];
      for (var i = 0; i < contracts.length; i++) {
        var contract = contracts[i];

        // Load file without require, to avoid caching.
        var Module = module.constructor;
        var m = new Module();
        m._compile(contract.code, contract.file);

        factories.push(m.exports);
      }

      var names = Pudding.load(factories, scope);

      callback(null, names, contracts);
    });
  },

  packageSource: function(source_directory, callback) {
    if (!fs.existsSync(source_directory)) {
      throw new Error("Source directory " + source_directory + " doesn't exist!");
    }

    PuddingLoader.contract_data(source_directory, function(err, contracts) {
      if (err) return callback(err);

      var output = "";

      for (var i = 0; i < contract.length; i++) {
        output += contract[i].code;
      }

      callback(null, output);
    });
  }
};

module.exports = PuddingLoader;
