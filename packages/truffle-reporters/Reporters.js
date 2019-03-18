const { compileReporter, compileEvents } = require("./compile");
const { unboxReporter, unboxEvents } = require("./unbox");
const Reporter = require("./Reporter");

const supportedEvents = { compile: compileEvents, unbox: unboxEvents };
const defaultReporters = { compileReporter, unboxReporter };

class Reporters {
  constructor(initializationOptions) {
    this.initializeReporters(initializationOptions);
  }

  initializeReporters(initializationOptions) {
    const { emitter } = initializationOptions;
    for (let reporterName in defaultReporters) {
      new Reporter({
        options: defaultReporters[reporterName],
        events: supportedEvents[reporterName],
        emitter
      });
    }
  }
}

module.exports = Reporters;
