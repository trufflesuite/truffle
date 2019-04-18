const { ReporterAggregator } = require("truffle-reporters");
const Emittery = require("emittery");
const Subscriber = require("./Subscriber");
const defaultSubscribers = require("./defaultSubscribers");

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
    this.emitter = new Emittery();

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

  initializeDefaultSubscribers() {
    for (let subscriber in defaultSubscribers) {
      new Subscriber({
        emitter: this.emitter,
        options: subscribers[subscriber]
      });
    }
  }

  initializeReporters(initializationOptions) {
    new ReporterAggregator(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    const { muteReporters } = initializationOptions;
    if (!muteReporters) this.initializeReporters(initializationOptions);
    this.initializeDefaultSubscribers();
  }
}

module.exports = EventManager;
