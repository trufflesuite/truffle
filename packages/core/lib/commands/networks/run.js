module.exports = async function (options) {
  const Config = require("@truffle/config");
  const Networks = require("../../networks");

  const config = Config.detect(options);

  if (options.clean) {
    return await Networks.clean(config);
  }
  return await Networks.display(config);
};
