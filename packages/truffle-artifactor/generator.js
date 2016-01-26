var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var babel = require("babel-core");
var es2015 = require("babel-preset-es2015");
var stagetwo = require("babel-preset-stage-2")
var class_template = fs.readFileSync(path.join(__dirname, "./classtemplate.es6"), {encoding: "utf8"});
var pkg = require("./package.json");

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

  generate: function(contract_name, contract_data, options) {
    var classfile = class_template;

    classfile = classfile.replace(/\{\{NAME\}\}/g, contract_name);
    classfile = classfile.replace(/\{\{BINARY\}\}/g, contract_data.binary || "");
    classfile = classfile.replace(/\{\{ABI\}\}/g, JSON.stringify(contract_data.abi));
    classfile = classfile.replace(/\{\{ADDRESS\}\}/g, contract_data.address || "");
    classfile = classfile.replace(/\{\{PUDDING_VERSION\}\}/g, pkg.version);

    var code = babel.transform(classfile, {
      filename: contract_name + ".sol.js",
      compact: false,
      presets: [
        es2015,
        stagetwo
      ],
      ast: false,
    }).code;

    return code;
  }
};
