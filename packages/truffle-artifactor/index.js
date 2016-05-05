var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var class_template = fs.readFileSync(path.join(__dirname, "./classtemplate.js"), {encoding: "utf8"});
var pkg = require("./package.json");
var dir = require("node-dir");
var _ = require("lodash");

// TODO: This should probably be asynchronous.
module.exports = {
  save: function(contract_name, contract_data, filename, options) {
    if (typeof contract_name == "object") {
      options = filename;
      filename = contract_data;
      contract_data = contract_name;
      contract_name = "Contract";
    }

    options = options || {};

    var network_id = options.network_id || "default";
    var existing_networks = {};

    if (options.overwrite != true && fs.existsSync(filename)) {
      var Contract = this.requireNoCache(filename);
      existing_networks = Contract.all_networks;
    }

    if (existing_networks[network_id] == null) {
      existing_networks[network_id] = {};
    }

    _.merge(existing_networks[network_id], contract_data);

    var network_ids = Object.keys(existing_networks);
    if (network_ids.length == 1 && network_ids[0] != "default") {
      existing_networks["default"] = existing_networks[network_ids[0]];
    }

    var final_source = this.generate(contract_name, existing_networks);

    fs.writeFileSync(filename, final_source, {encoding: "utf8"});
  },

  saveAll: function(contracts, destination, options) {
    if (!fs.existsSync(destination)) {
      throw new Error("Desination " + destination + " doesn't exist!");
    }

    for (var contract_name of Object.keys(contracts)) {
      var contract_data = contracts[contract_name];
      var filename = path.join(destination, contract_name + ".sol.js");

      this.save(contract_data, contract_name, filename, options);
    }
  },

  generate: function(contract_name, networks) {
    if (typeof contract_name == "object") {
      networks = contract_name;
      contract_name = "Contract";
    }


    if (this.isSingleLevelObject(networks)) {
      networks = {
        "default": networks
      };
    }

    var classfile = class_template;

    classfile = classfile.replace(/\{\{ALL_NETWORKS\}\}/g, JSON.stringify(networks));
    classfile = classfile.replace(/\{\{NAME\}\}/g, contract_name);
    classfile = classfile.replace(/\{\{PUDDING_VERSION\}\}/g, pkg.version);

    return classfile;
  },

  whisk: function(contract_name, networks) {
    var source = this.generate(contract_name, networks);

    var Module = module.constructor;
    var m = new Module();
    m._compile(source, contract_name + ".sol.js");
    return m.exports;
  },

  isSingleLevelObject: function(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = obj[key];

      if (typeof val == "object" && !Array.isArray(val)) {
        return false;
      }
    }
    return true;
  },

  // Will upgrade all .sol.js files in place.
  // Used for a past version bump. May not be useful any longer.
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
  },

  requireNoCache: function(filePath) {
    delete require.cache[path.resolve(filePath)];
    return require(filePath);
  }
};
