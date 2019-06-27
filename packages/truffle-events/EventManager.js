const SubscriberAggregator = require("./SubscriberAggregator");
const Emittery = require("emittery");

class EventManager {
  constructor(eventManagerOptions) {
    let { logger, muteReporters } = eventManagerOptions;

    // Keep a reference to these so it can be cloned
    // if necessary in truffle-config
    this.initializationOptions = eventManagerOptions;
    this.emitter = new Emittery();
    this.subscriberAggregators = [];

    const initializationOptions = {
      emitter: this.emitter,
      logger,
      muteReporters
    };
    this.initializeSubscribers(initializationOptions);
  }

  emit(event, data) {
    return this.emitter.emit(event, data);
  }

  initializeSubscribers(initializationOptions) {
    this.subscriberAggregators.push(
      new SubscriberAggregator(initializationOptions)
    );
  }

  updateSubscriberOptions(newOptions) {
    this.subscriberAggregators.forEach(aggregator => {
      aggregator.updateSubscriberOptions(newOptions);
    });
  }
}

module.exports = EventManager;
