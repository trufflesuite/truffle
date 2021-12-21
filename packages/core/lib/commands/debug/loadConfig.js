module.exports = function (options) {
  const Config = require("@truffle/config");
  const TruffleError = require("@truffle/error");

  let config;
  try {
    config = Config.detect(options);
  } catch (error) {
    if (error instanceof TruffleError && options.url) {
      // in case config file is not detected (exception) AND url is provided in the options
      // we use default config and set compileNone to true
      config = Config.default();
      config.compileNone = true;
    } else {
      throw error;
    }
  }

  return config;
};
