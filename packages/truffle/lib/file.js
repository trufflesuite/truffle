var fs = require("fs");

var File = {
  duplicate: function(path, destination, callback) {
    fs.readFile(path, {encoding: "utf8"}, function(err, data) {
      if (err != null) {
        callback(err);
        return;
      }

      fs.writeFile(destination, data, {encoding: "utf8"}, callback);
    });
  },
  process: function(path, processfn, callback) {
    fs.readFile(path, {encoding: "utf8"}, function(err, data) {
      if (err != null) {
        callback(err);
        return;
      }

      var result = processfn(data);
      fs.writeFile(path, result, {encoding: "utf8"}, callback);
    });
  },
  replace: function(path, find, replace, callback) {
    File.process(path, function(data) {
      if (typeof find == "string") {
        find = new RegExp(find, "g");
      }
      return data.replace(find, replace);
    }, callback);
  }
}

module.exports = File;
