var whilst = require("async/whilst");

var Resolver = {
  resolve: function(import_path, sources, imported_from, callback) {
    if (typeof imported_from == "function") {
      callback = imported_from;
      imported_from = null;
    }

    var body = null;
    var current_index = -1;
    var current_source;

    whilst(function() {
      return !body && current_index < sources.length - 1;
    }, function(next) {
      current_index += 1;
      current_source = sources[current_index];

      current_source.find(import_path, function(err, potential_source) {
        body = potential_source;
        next();
      });
    }, function(err) {
      if (err) return callback(err);

      if (!body) {
        var message = "Could not find " + import_path + " from any sources";

        if (imported_from) {
          message += "; imported from " + imported_from;
        }

        return callback(new Error(message));
      }

      callback(null, body, current_source);
    })
  }
};

module.exports = Resolver;
