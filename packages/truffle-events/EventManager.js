const { ReporterAggregator } = require("truffle-reporters");
const Emittery = require("emittery");
const Subscriber = require("./Subscriber");
const subscribers = require("./subscribers");

class EventManager {
  constructor(eventManagerOptions) {
    const {
      logger,
      muteReporters,
      globalConfig,
      reporters
    } = eventManagerOptions;

    // Keep a reference to these so it can be cloned
    // if necessary in truffle-config
    this.initializationOptions = eventManagerOptions;

    const emitter = new Emittery();
    this.emitter = emitter;

    const initializationOptions = {
      emitter,
      globalConfig,
      logger,
      muteReporters,
      reporters
    };
    this.initializeSubscribers(initializationOptions);
  }

  emit(event, data) {
    this.emitter.emit(event, data);
  }

  initializeReporters(initializationOptions) {
    new ReporterAggregator(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    const { muteReporters } = initializationOptions;
    if (!muteReporters) this.initializeReporters(initializationOptions);

    for (let subscriber in subscribers) {
      new Subscriber({
        emitter: this.emitter,
        options: subscribers[subscriber]
      });
    }
  }
}

module.exports = EventManager;
