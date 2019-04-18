const { unbox, compile, obtain } = require("./reporters");
const Subscriber = require("./Subscriber.js");
const defaultReporters = { compile, unbox, obtain };

class ReporterAggregator {
  constructor(initializationOptions) {
    this.initializeReporters(initializationOptions);
  }

  initializeReporters(initializationOptions) {
    const { emitter, reporters } = initializationOptions;
    for (let reporterName in defaultReporters) {
      new Subscriber({
        options: defaultReporters[reporterName],
        emitter
      });
    }
    if (reporters) {
      for (let reporterName in reporters) {
        new Subscriber({
          options: reporters[reporterName],
          emitter
        });
      }
    }
  }
}

module.exports = ReporterAggregator;
