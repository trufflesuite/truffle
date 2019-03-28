const { unbox, compile } = require("./reporters");
const Reporter = require("./Reporter");

const defaultReporters = { compile, unbox };

class Reporters {
  constructor() {
    this.initializeReporters();
  }

  initializeReporters() {
    for (let reporterName in defaultReporters) {
      new Reporter({ options: defaultReporters[reporterName] });
    }
  }
}

module.exports = Reporters;
