const compilation = require("./compilation");

class Reporter {
  constructor(options) {
    const { logger, emitter } = options;
    this.emitter = emitter;
    this.logger = logger;
    this.initializeListeners();
  }

  initializeListeners() {
    const options = {
      logger: this.logger,
      emitter: this.emitter
    };
    compilation.initializeListeners(options);
  }
}

module.exports = Reporter;
