const Subscriber = require("./Subscriber");
const defaultSubscribers = require("./defaultSubscribers");

class SubscriberAggregator {
  constructor(initializationOptions) {
    this.initializeSubscribers(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    const { emitter } = initializationOptions;
    for (let subscriberName in defaultSubscribers) {
      new Subscriber({
        options: defaultSubscribers[subscriberName],
        emitter
      });
    }
  }
}

module.exports = SubscriberAggregator;
