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
      logger: this.logger
    };
    this.emitter.on(
      "compilation:startJob",
      compilation.triggerEvent.bind(compilation, "startJob", options)
    );
  }
}

module.exports = Reporter;
