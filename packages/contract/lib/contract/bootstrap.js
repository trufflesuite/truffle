const execute = require("../execute");

module.exports = fn => {
  // Add our static methods
  // Add something here about excluding send, privately defined methods
  Object.keys(fn._constructorMethods).forEach(function (key) {
    fn[key] = fn._constructorMethods[key].bind(fn);
  });

  // Add our properties.
  Object.keys(fn._properties).forEach(function (key) {
    fn.addProp(key, fn._properties[key]);
  });

  // estimateGas & request as sub-property of new
  fn["new"].estimateGas = execute.estimateDeployment.bind(fn);
  fn["new"].request = execute.requestDeployment.bind(fn);

  return fn;
};
