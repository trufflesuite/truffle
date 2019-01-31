const compile = require("./compile");

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
    compile.initializeListeners(options);
  }
}

module.exports = Reporter;
