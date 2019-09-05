const SubscriberAggregator = require("./SubscriberAggregator");
const Emittery = require("emittery");
const defaultSubscribers = require("./defaultSubscribers");

class EventManager {
  constructor(eventManagerOptions) {
    let { logger, muteLogging, subscribers } = eventManagerOptions;

    this.emitter = new Emittery();
    this.subscriberAggregators = [];

    this.initializationOptions = {
      emitter: this.emitter,
      logger,
      muteLogging,
      subscribers
    };
    this.initializeDefaultSubscribers(this.initializationOptions);
  }

  emit(event, data) {
    return this.emitter.emit(event, data);
  }

  initializeDefaultSubscribers(initializationOptions) {
    const aggregatorOptions = Object.assign({}, initializationOptions, {
      subscribers: defaultSubscribers
    });
    this.subscriberAggregators.push(
      new SubscriberAggregator(aggregatorOptions)
    );
  }

  initializeUserSubscribers(initializationOptions) {
    const { subscribers } = initializationOptions;
    if (subscribers && Object.keys(subscribers).length > 0) {
      const aggregatorOptions = Object.assign({}, initializationOptions, {
        emitter: this.emitter
      });
      this.subscriberAggregators.push(
        new SubscriberAggregator(aggregatorOptions)
      );
    }
  }

  updateSubscriberOptions(newOptions) {
    this.subscriberAggregators.forEach(aggregator => {
      aggregator.updateSubscriberOptions(newOptions);
    });
  }
}

module.exports = EventManager;
