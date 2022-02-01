const debug = require("debug")("deployer:sanitizeMessage");

module.exports = message => {
  if (Array.isArray(message)) {
    // for some reason, message is returned as an array padded with many
    // empty arrays - should investigate this further later
    debug("processing the following message - %o", message);
    return message[0];
  }
  return message;
};
