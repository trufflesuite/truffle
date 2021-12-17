module.exports = function (options) {
  const Config = require("@truffle/config");

  let config;
  try {
    config = Config.detect(options);
  } catch (error) {
    if (options.url) {
      config = Config.default();
      config.compileNone = true;
    } else {
      throw error;
    }
  }

  return config;
};
