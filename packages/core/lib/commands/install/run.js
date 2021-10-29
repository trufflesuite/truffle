module.exports = async function (options) {
  const Config = require("@truffle/config");
  const Package = require("../../package");

  if (options._ && options._.length > 0) options.packages = options._;

  const config = Config.detect(options);
  return await Package.install(config);
};
