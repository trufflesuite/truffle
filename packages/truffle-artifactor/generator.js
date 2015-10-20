var fs = require("fs");
var path = require("path");
var class_template = fs.readFileSync(path.join(__dirname, "./classtemplate.js"), {encoding: "utf8"});

// TODO: This should probably be asynchronous.
module.exports = function(contracts, destination, options) {

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
    var classfile = class_template;

    console.log(contract_data);

    classfile = classfile.replace(/\{\{NAME\}\}/g, contract_name);
    classfile = classfile.replace(/\{\{BINARY\}\}/g, contract_data.binary || "");
    classfile = classfile.replace(/\{\{ABI\}\}/g, JSON.stringify(contract_data.abi));
    classfile = classfile.replace(/\{\{ADDRESS\}\}/g, contract_data.address || "");

    var output_path = path.join(destination, contract_name + ".sol.js");

    fs.writeFileSync(output_path, classfile, {encoding: "utf8"});
  }

};
