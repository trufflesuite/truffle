const SubscriberAggregator = require("./SubscriberAggregator");
const Emittery = require("emittery");

class EventManager {
  constructor(eventManagerOptions) {
    const { logger, muteReporters, globalConfig } = eventManagerOptions;

    // Keep a reference to these so it can be cloned
    // if necessary in truffle-config
    this.initializationOptions = eventManagerOptions;
    this.emitter = new Emittery();

    const initializationOptions = {
      emitter: this.emitter,
      globalConfig,
      logger,
      muteReporters
    };
    this.initializeSubscribers(initializationOptions);
  }

  emit(event, data) {
    return this.emitter.emit(event, data);
  }

  initializeSubscribers(initializationOptions) {
    new SubscriberAggregator(initializationOptions);
  }
}

module.exports = EventManager;
