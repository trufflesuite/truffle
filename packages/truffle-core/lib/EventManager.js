const Emittery = require("emittery");
const { Reporters } = require("truffle-reporters");

class EventManager {
  constructor(eventManagerOptions) {
    const { logger, muteReporters, globalConfig } = eventManagerOptions;

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

  emitEvent(event, data) {
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
