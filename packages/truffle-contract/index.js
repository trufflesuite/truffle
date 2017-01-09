var Schema = require("truffle-schema");
var Contract = require("./contract.js");

module.exports = function(options) {
  options = Schema.normalizeOptions(options);
  var binary = Schema.generateBinary(options);

  // Note we don't use `new` here at all. This will cause the class to
  // "mutate" instead of instantiate an instance.
  return Contract.clone(binary);
};
