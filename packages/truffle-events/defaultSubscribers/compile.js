const Contracts = require("truffle-workflow-compile");

module.exports = {
  handlers: {
    startCompilation: [
      function({ config, done }) {
        console.log("running the compilation handler");
        Contracts.compile(config, done);
      }
    ]
  }
};
