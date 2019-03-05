const Emittery = require("emittery");
const { Reporters } = require("truffle-reporters");

class EventManager {
  constructor(eventManagerOptions) {
    const { logger, muteReporters, globalConfig } = eventManagerOptions;

    // Keep a reference to these so it can be cloned
    // if necessary in truffle-config
    this.initializationOptions = eventManagerOptions;

    const emitter = new Emittery();
    this.emitter = emitter;

    const initializationOptions = {
      globalConfig,
      emitter,
      logger,
      muteReporters
    };
    this.initializeSubscribers(initializationOptions);
  }

  emit(event, data) {
    this.emitter.emit(event, data);
  }

  initializeReporters(initializationOptions) {
    new Reporters(initializationOptions);
  }

  initializeSubscribers(initializationOptions) {
    const { muteReporters } = initializationOptions;
    if (!muteReporters) {
      this.initializeReporters(initializationOptions);
    }
  }
}

const eventManager = config => {
  const logger = config.logger || console;
  return new EventManager({
    logger,
    muteReporters: config.quiet,
    globalConfig: config
  });
};

module.exports = eventManager;
