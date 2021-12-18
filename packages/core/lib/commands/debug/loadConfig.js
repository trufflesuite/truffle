module.exports = function (options) {
  const Config = require("@truffle/config");
  const TruffleError = require("@truffle/error");

  let config;
  try {
    config = Config.detect(options);
  } catch (error) {
    if (error instanceof TruffleError && options.url) {
      config = Config.default();
      config.compileNone = true;
    } else {
      throw error;
    }
  }

  return config;
};
