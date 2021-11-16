const helpers = require("./helpers");
const { createLookupTable, sortHandlers, validateOptions } = helpers;

class Subscriber {
  constructor({ emitter, options, config }) {
    validateOptions(options);
    const { initialization, handlers } = options;

    this.emitter = emitter;
    // Object for storing unsubscribe methods for non-globbed listeners
    this.unsubscribeListeners = {};
    this.quiet = config.quiet;
    this.config = config;
    if (config.logger) this.logger = config.logger;
    if (initialization) initialization.bind(this)(config);

    const { globbedHandlers, nonGlobbedHandlers } = sortHandlers(handlers);

    if (nonGlobbedHandlers) this.setUpListeners(nonGlobbedHandlers);

    if (globbedHandlers) {
      this.globbedHandlers = globbedHandlers;
      this.setUpGlobbedListeners(globbedHandlers);
    }
  }

  handleEvent(eventName, data) {
    let promises = [];
    for (let handlerName in this.globbedHandlerLookupTable) {
      if (this.globbedHandlerLookupTable[handlerName].test(eventName)) {
        this.globbedHandlers[handlerName].forEach(handler => {
          promises.push(handler.bind(this)(data, eventName));
        });
      }
    }
    return Promise.all(promises);
  }

  removeListener(name) {
    if (this.unsubscribeListeners.hasOwnProperty(name)) {
      this.unsubscribeListeners[name]();
    }
    if (this.globbedHandlerLookupTable[name]) {
      delete this.globbedHandlerLookupTable[name];
    }
  }

  setUpGlobbedListeners(handlers) {
    const handlerNames = Object.keys(handlers);
    this.globbedHandlerLookupTable = createLookupTable(handlerNames);
    this.emitter.onAny(this.handleEvent.bind(this));
  }

  setUpListeners(handlers) {
    for (let handlerName in handlers) {
      handlers[handlerName].forEach(handler => {
        this.unsubscribeListeners[handlerName] = this.emitter.on(
          handlerName,
          handler.bind(this)
        );
      });
    }
  }

  updateOptions(config) {
    this.config = config;
    if (config.quiet) this.quiet = true;
    if (config.logger) this.logger = config.logger;
  }
}

module.exports = Subscriber;
