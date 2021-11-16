const Subscriber = require("./Subscriber");

class SubscriberAggregator {
  constructor(initializationOptions) {
    this.subscribers = [];
    this.initializeSubscribers(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    let { emitter, subscribers, config } = initializationOptions;
    for (let name in subscribers) {
      this.subscribers.push(
        new Subscriber({
          config,
          options: subscribers[name],
          emitter
        })
      );
    }
  }

  updateSubscriberOptions(config) {
    this.subscribers.forEach(subscriber => {
      subscriber.updateOptions(config);
    });
  }
}

module.exports = SubscriberAggregator;
