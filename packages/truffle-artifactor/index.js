var Schema = require("truffle-contract-schema");
var expect = require("truffle-expect");
var fs = require("fs-extra");
var path = require("path");
var async = require("async");
var _ = require("lodash");

function Artifactor(destination, source_directory) {
  this.destination = destination;
  this.source_directory = source_directory;
};

Artifactor.prototype.save = function(object) {
  var self = this;

  return new Promise(function(accept, reject) {
    object = Schema.normalizeInput(object);

    if (object.contract_name == null) {
      return reject(new Error("You must specify a contract name."));
    }

    // Build the source path from input object.
    var output_path = object.source_path || object.contract_name;

    // Remove source directory if prefixed.
    output_path = output_path.replace(self.source_directory, "");

    // Remove .sol extension
    output_path = output_path.replace(".sol");

    // Create new path off of contracts_build_directory.
    output_path = path.join(self.destination.replace(self.source_directory, ""), output_path);
    output_path = path.resolve(output_path);

    // Add json extension.
    output_path = output_path + ".json";

    fs.readFile(output_path, {encoding: "utf8"}, function(err, json) {
      // No need to handle the error. If the file doesn't exist then we'll start afresh
      // with a new object (see generateObject()).
      var existing_binary;

      if (!err) {
        try {
          existing_binary = JSON.parse(json);
        } catch (e) {
          // Do nothing
        }
      }

      var final_binary;
      try {
        final_binary = Schema.generateObject(object, existing_binary);
      } catch (e) {
        return reject(e);
      }

      fs.outputFile(output_path, JSON.stringify(final_binary, null, 2), "utf8", function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  });
};

Artifactor.prototype.saveAll = function(objects) {
  var self = this;

  if (Array.isArray(objects)) {
    var array = objects;
    objects = {};

    array.forEach(function(item) {
      objects[item.contract_name] = item;
    })
  }

  return new Promise(function(accept, reject) {
    fs.stat(self.destination, function(err, stat) {
      if (err) {
        return reject(new Error("Desination " + self.destination + " doesn't exist!"));
      }

      async.each(Object.keys(objects), function(contract_name, done) {
        var object = objects[contract_name];
        object.contract_name = contract_name;
        self.save(object).then(done).catch(done);
      }, function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  });
};

module.exports = Artifactor;
