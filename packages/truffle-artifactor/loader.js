var fs = require("fs");
var path = require("path");
var dir = require("node-dir");

module.exports = {
  load: function(source, Pudding, scope, callback) {
    if (!fs.existsSync(source)) {
      throw new Error("Source directory " + source + " doesn't exist!");
    }

    dir.files(source, function(err, files) {
      if (err != null) {
        callback(err);
        return;
      }

      var factories = [];

      for (var file of files) {
        var filename = path.basename(file);
        if (filename.indexOf(".sol.js") > 0) {
          var class_name = path.basename(filename, ".sol.js");

          // Load file without require, to avoid caching.
          var code = fs.readFileSync(file, {encoding: "utf8"});
          var Module = module.constructor;
          var m = new Module();
          m._compile(code);

          factories.push(m.exports);
        }
      }

      var names = Pudding.load(factories, scope);

      callback(null, names);
    });
  },

  packageSource: function(source, callback) {
    if (!fs.existsSync(source)) {
      throw new Error("Source directory " + source + " doesn't exist!");
    }

    dir.files(source, function(err, files) {
      if (err != null) {
        callback(err);
        return;
      }

      var output = "";

      for (var file of files) {
        var filename = path.basename(file);
        if (filename.indexOf(".sol.js") > 0) {
          output += fs.readFileSync(file, {encoding: "utf8"}) + ";\n\n";
        }
      }

      callback(null, output);
    });
  }
};
