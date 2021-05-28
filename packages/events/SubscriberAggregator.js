const Subscriber = require("./Subscriber");

class SubscriberAggregator {
  constructor(initializationOptions) {
    this.subscribers = [];
    this.initializeSubscribers(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    let { emitter, logger, quiet, subscribers } = initializationOptions;
    for (let name in subscribers) {
      this.subscribers.push(
        new Subscriber({
          options: subscribers[name],
          emitter,
          logger,
          quiet
        })
      );
    }
  }

  updateSubscriberOptions(newOptions) {
    let { logger, quiet } = newOptions;
    this.subscribers.forEach(subscriber => {
      subscriber.updateOptions({
        logger,
        quiet
      });
    });
  }
}

module.exports = SubscriberAggregator;
