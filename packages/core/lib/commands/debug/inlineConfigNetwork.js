module.exports = function (options) {
  const Config = require("@truffle/config");

  const configObject = Config.default();
  configObject.networks = {
    inline_config: {
      url: options.url,
      network_id: "*"
    }
  };
  configObject.network = options.network ? options.network : "inline_config";
  configObject.compileNone = true;
  configObject._ = [];
  configObject.merge(options);

  return configObject;
};
