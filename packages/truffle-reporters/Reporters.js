const compile = require("./compile/index1");
const Reporter = require("./Reporter");
// const UnboxReporter = require("./unbox");

class Reporters {
  constructor(initializationOptions) {
    this.initializeReporters(initializationOptions);
  }

  initializeReporters(initializationOptions) {
    const { emitter } = initializationOptions;
    new Reporter({ options: compile[0], emitter });
    // compile.initializeListeners(initializationOptions);
    // new UnboxReporter(initializationOptions);
  }
}

module.exports = Reporters;
