module.exports = async function (options) {
  const Config = require("@truffle/config");
  const Package = require("../../package");

  const config = Config.detect(options);
  return await Package.publish(config);
};
