const compile = require("./compile");
const unbox = require("./unbox");

class Reporters {
  constructor(initializationOptions) {
    this.initializeListeners(initializationOptions);
  }

  initializeListeners(initializationOptions) {
    compile.initializeListeners(initializationOptions);
    unbox.initializeListeners(initializationOptions);
  }
}

module.exports = Reporters;
