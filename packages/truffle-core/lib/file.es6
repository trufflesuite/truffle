var fs = require("fs");

var File = {
  duplicate(path, destination, callback) {
    fs.readFile(path, 'utf8', function(err, data) {
      if (err != null) {
        callback(err);
        return;
      }

      fs.writeFile(destination, data, 'utf8', callback);
    });
  },
  process(path, processfn, callback) {
    fs.readFile(path, 'utf8', function(err, data) {
      if (err != null) {
        callback(err);
        return;
      }

      var result = processfn(data);
      fs.writeFile(path, result, 'utf8', callback);
    });
  },
  replace(path, find, replace, callback) {
    File.process(path, function(data) {
      if (typeof find == "string") {
        find = new RegExp(find, "g");
      }
      return data.replace(find, replace);
    }, callback);
  }
}

module.exports = File;
