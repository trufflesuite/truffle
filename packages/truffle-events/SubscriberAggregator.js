const Subscriber = require("./Subscriber");
const defaultSubscribers = require("./defaultSubscribers");

class SubscriberAggregator {
  constructor(initializationOptions) {
    this.subscribers = [];
    this.initializeSubscribers(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    let { emitter, logger, muteLogging } = initializationOptions;
    if (muteLogging) logger = () => {};
    for (let subscriberName in defaultSubscribers) {
      this.subscribers.push(
        new Subscriber({
          options: defaultSubscribers[subscriberName],
          emitter,
          logger
        })
      );
    }
  }

  updateSubscriberOptions(newOptions) {
    let { logger, muteLogging } = newOptions;
    if (muteLogging) {
      logger = { log: () => {} };
    }
    this.subscribers.forEach(subscriber => {
      subscriber.updateOptions({
        logger
      });
    });
  }
}

module.exports = SubscriberAggregator;
