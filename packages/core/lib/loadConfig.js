module.exports = function (options) {
  const Config = require("@truffle/config");
  const TruffleError = require("@truffle/error");
  const mergeConfigNetwork = require("./mergeConfigNetwork");

  let config;
  try {
    config = Config.detect(options);
    config = mergeConfigNetwork(config, options);
  } catch (error) {
    if (error instanceof TruffleError && options.url) {
      config = Config.default();
      config = mergeConfigNetwork(config, options);
      // in case config file is not detected (exception thrown) AND url is provided in the options,
      // We use default config and set compileNone to true. Since there are is no config files and url is provided,
      // It is assumed that truffle debug/console is being used for analysis and debugging and that there is nothing to compile.
      // E.g. analysing/debugging a single transaction of an external project
      config.compileNone = true;
      config.configFileSkipped = true;
    } else {
      throw error;
    }
  }

  return config;
};
