var Schema = require("truffle-contract-schema");
var expect = require("truffle-expect");
var fs = require("fs-extra");
var path = require("path");
var async = require("async");
var _ = require("lodash");
var debug = require("debug")("artifactor");

function Artifactor(destination) {
  this.destination = destination;
};

Artifactor.prototype.save = function(object) {
  var self = this;

  return new Promise(function(accept, reject) {
    object = Schema.normalize(object);

    if (object.contractName == null) {
      return reject(new Error("You must specify a contract name."));
    }

    var output_path = object.contractName;

    // Create new path off of destination.
    output_path = path.join(self.destination, output_path);
    output_path = path.resolve(output_path);

    // Add json extension.
    output_path = output_path + ".json";

    fs.readFile(output_path, {encoding: "utf8"}, function(err, json) {
      // No need to handle the error. If the file doesn't exist then we'll start afresh
      // with a new object.

      var finalObject = object;

      if (!err) {
        var existingObjDirty;
        try {
          existingObjDirty = JSON.parse(json);
        } catch (e) {
          reject(e);
        }

        // normalize existing and merge into final
        finalObject = Schema.normalize(existingObjDirty);

        // merge networks
        var finalNetworks = {};
        _.merge(finalNetworks, finalObject.networks, object.networks);

        // update existing with new
        _.assign(finalObject, object);
        finalObject.networks = finalNetworks;
      }

      // update timestamp
      finalObject.updatedAt = new Date().toISOString();

      // output object
      fs.outputFile(output_path, JSON.stringify(finalObject, null, 2), "utf8", function(err) {
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
      accept();
    });
  }).then(function() {
    var promises = [];

    Object.keys(objects).forEach(function(contractName) {
      var object = objects[contractName];
      object.contractName = contractName;
      promises.push(self.save(object));
    });

    return Promise.all(promises);
  });
};

module.exports = Artifactor;
