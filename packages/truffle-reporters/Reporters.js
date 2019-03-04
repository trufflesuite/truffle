const compile = require("./compile");
const unbox = require("./unbox");
const Reporter = require("./Reporter");

const defaultReporters = [compile, unbox];

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
