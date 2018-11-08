const command = {
  command: "slither-analyze",
  description: "Run slither",
  builder: {},
  help: {
    usage: "truffle slither-analyze",
    options: []
  },
  run: function(options) {
    const slither_analyze = require("truffle-slither-analyze");
    let flags = {};

    Object.keys(options)
      .filter(item => {
        return ["_", "logger"].indexOf(item) == -1;
      })
      .forEach(key => (flags[key] = options[key]));

    let all_flags = Object.keys(flags).reduce((accumulator, key) => {
      accumulator.push(`--${key}`);
      if (flags[key] != true) {
        accumulator.push(flags[key]);
      }
      return accumulator;
    }, []);

    slither_analyze([...options._, ...all_flags]);
  }
};

module.exports = command;
