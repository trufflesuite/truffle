module.exports = function (options) {
  const Config = require("@truffle/config");
  const TruffleError = require("@truffle/error");

  let config;
  try {
    config = Config.detect(options);
  } catch (error) {
    if (error instanceof TruffleError && options.url) {
      // in case config file is not detected (exception thrown) AND url is provided in the options,
      // We use default config and set compileNone to true. Since there are is no config files and url is provided,
      // It is assumed that truffle debug is being used for analysis and debugging and that there is nothing to compile.
      // E.g. analysing/debugging a single transaction of an external project
      config = Config.default();
      config.compileNone = true;
    } else {
      throw error;
    }
  }

  return config;
};
