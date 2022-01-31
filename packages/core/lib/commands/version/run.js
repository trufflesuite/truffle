module.exports = async function (options) {
  const { detectConfigOrDefault } = require("../../utils/utils");
  const version = require("../../version");
  const { logger } = options;

  const config = detectConfigOrDefault(options);

  version.logAll(logger, config);
  return;
};
