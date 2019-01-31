const Emittery = require("emittery");
const { Reporter } = require("truffle-reporters");

class EventManager {
  constructor(options) {
    const { logger, muteReporters } = options;
    this.logger = logger || console;
    this.muteReporters = muteReporters;
    this.emitter = new Emittery();
    this.initializeSubscribers();
  }

  emitEvent(event, data) {
    this.emitter.emit(event, data);
  }

  initializeReporters() {
    const reporterOptions = {
      logger: this.logger,
      emitter: this.emitter
    };
    new Reporter(reporterOptions);
  }

  initializeSubscribers() {
    if (!this.muteReporters) {
      this.initializeReporters();
    }
  }
}

module.exports = EventManager;
