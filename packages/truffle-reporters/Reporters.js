const compile = require("./compile");
const Reporter = require("./Reporter");
// const UnboxReporter = require("./unbox");

const defaultReporters = [compile];

class Reporters {
  constructor(initializationOptions) {
    this.initializeReporters(initializationOptions);
  }

  initializeReporters(initializationOptions) {
    const { emitter } = initializationOptions;
    defaultReporters.forEach(reporter => {
      new Reporter({ options: reporter, emitter });
    });
  }
}

module.exports = Reporters;
