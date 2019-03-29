const { ReporterAggregator } = require("truffle-reporters");
const Emittery = require("emittery");

class EventManager {
  constructor(eventManagerOptions) {
    const { logger, muteReporters, globalConfig } = eventManagerOptions;

    // Keep a reference to these so it can be cloned
    // if necessary in truffle-config
    this.initializationOptions = eventManagerOptions;

    const emitter = new Emittery();
    this.emitter = emitter;

    const initializationOptions = {
      emitter,
      globalConfig,
      logger,
      muteReporters
    };
    this.initializeSubscribers(initializationOptions);
  }

  emit(event, data) {
    if (this.reporters) this.reporters.emit(event, data);
  }

  initializeReporters(initializationOptions) {
    this.reporters = new ReporterAggregator(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    const { muteReporters } = initializationOptions;
    if (!muteReporters) this.initializeReporters(initializationOptions);
  }
}

module.exports = EventManager;
