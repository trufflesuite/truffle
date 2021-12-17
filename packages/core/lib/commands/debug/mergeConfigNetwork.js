module.exports = function (config, options) {
  const inlineConfigNetwork = "inline_config";
  config.networks[inlineConfigNetwork] = {
    url: options.url,
    network_id: "*"
  };
  config.network = inlineConfigNetwork;
  config.merge(options);
};
