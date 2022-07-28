const { TruffleError } = require("@truffle/error");

const checkPluginConfig = ({ plugins }) => {
  if (!plugins) {
    throw new TruffleError(
      "\nError: No plugins detected in the configuration file.\n"
    );
  }

  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new TruffleError("\nError: Plugins configured incorrectly.\n");
  }
};

module.exports = {
  checkPluginConfig
};
