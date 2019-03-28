const { unbox, compile } = require("./reporters");
const Reporter = require("./Reporter");
const defaultReporters = { compile, unbox };

class ReporterAggregator {
  constructor() {
    this.reporters = [];
    this.initializeReporters();
  }

  emit(event, data) {
    if (this.reporters) {
      this.reporters.forEach(reporter => reporter.handleEvent(event, data));
    }
  }

  initializeReporters() {
    for (let reporterName in defaultReporters) {
      this.reporters = this.reporters.concat(
        new Reporter(defaultReporters[reporterName])
      );
    }
  }
}

module.exports = ReporterAggregator;
