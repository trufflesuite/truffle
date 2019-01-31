const compilation = require("./compilation");

class Reporter {
  constructor(options) {
    const { quiet, logger, emitter } = options;
    this.emitter = emitter;
    this.logger = logger;
    this.quiet = quiet;
    this.initializeListeners();
  }

  initializeListeners() {
    if (this.quiet) return;
    const options = {
      logger: this.logger
    };
    this.emitter.on(
      "compilation:startJob",
      compilation.triggerEvent.bind(compilation, "startJob", options)
    );
    this.emitter.on(
      "compilation:finishJob",
      compilation.triggerEvent.bind(compilation, "finishJob", options)
    );
    this.emitter.on(
      "compilation:writeArtifacts",
      compilation.triggerEvent.bind(compilation, "writeArtifacts", options)
    );
    this.emitter.on(
      "compilation:warnings",
      compilation.triggerEvent.bind(compilation, "warnings", options)
    );
    this.emitter.on(
      "compilation:compiledSources",
      compilation.triggerEvent.bind(compilation, "compiledSources", options)
    );
  }
}

module.exports = Reporter;
