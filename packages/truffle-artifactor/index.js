var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var class_template = fs.readFileSync(path.join(__dirname, "./classtemplate.es6"), {encoding: "utf8"});
var pkg = require("./package.json");
var dir = require("node-dir");

// TODO: This should probably be asynchronous.
module.exports = {
  save: function(contracts, destination, options) {
    if (!fs.existsSync(destination)) {
      throw new Error("Desination " + destination + " doesn't exist!");
    }

    if (options == null) {
      options = {};
    }

    if (options.removeExisting == true) {
      rimraf.sync(path.join(destination, "./*.sol.js"));
    }

    for (var contract_name of Object.keys(contracts)) {
      var contract_data = contracts[contract_name];
      var output_path = path.join(destination, contract_name + ".sol.js");

      fs.writeFileSync(output_path, this.generate(contract_name, contract_data), {encoding: "utf8"});
    }
  },

  generate: function(contract_name, contract_data) {
    var classfile = class_template;

    classfile = classfile.replace(/\{\{NAME\}\}/g, contract_name);
    classfile = classfile.replace(/\{\{BINARY\}\}/g, contract_data.binary || "");
    classfile = classfile.replace(/\{\{UNLINKED_BINARY\}\}/g, contract_data.unlinked_binary || contract_data.binary || "");
    classfile = classfile.replace(/\{\{ABI\}\}/g, JSON.stringify(contract_data.abi));
    classfile = classfile.replace(/\{\{ADDRESS\}\}/g, contract_data.address || "");
    classfile = classfile.replace(/\{\{PUDDING_VERSION\}\}/g, pkg.version);

    return classfile;
  },

  // Will upgrade all .sol.js files in place.
  upgrade: function(source_directory, callback) {
    var self = this;
    var Pudding = require(".");

    if (!fs.existsSync(source_directory)) {
      callback(new Error("Source directory " + source_directory + " doesn't exist!"));
    }

    dir.files(source_directory, function(err, files) {
      if (err != null) {
        callback(err);
        return;
      }

      var found = [];

      for (var file of files) {
        if (path.basename(file).indexOf(".sol.js") > 0) {
          var cls = require(file);
          cls = cls.load(Pudding);

          var source = self.generate(cls.contract_name, {
            abi: cls.abi,
            binary: cls.binary,
            address: cls.address
          });

          fs.writeFileSync(file, source, {encoding: "utf8"});
        }
      }

      callback(null, found);
    });

  }
};
