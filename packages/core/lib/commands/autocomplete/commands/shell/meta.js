module.exports = function (shell) {
  return {
    command: shell,
    description: `Output ${shell} completion settings`,
    builder: {},
    help: {
      usage: `truffle autocomplete ${shell}`,
      options: [],
      allowedGlobalOptions: []
    }
  };
};
