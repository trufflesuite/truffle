const compile = require("./compile");
const UnboxReporter = require("./unbox");

class Reporters {
  constructor(initializationOptions) {
    this.initializeListeners(initializationOptions);
  }

  initializeListeners(initializationOptions) {
    compile.initializeListeners(initializationOptions);
    new UnboxReporter(initializationOptions);
  }
}

module.exports = Reporters;
