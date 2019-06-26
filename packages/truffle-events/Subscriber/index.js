const helpers = require("./helpers");
const { createLookupTable, sortHandlers, validateOptions } = helpers;

class Subscriber {
  constructor({ emitter, options }) {
    validateOptions(options);
    const { initialization, handlers } = options;

    this.emitter = emitter;
    // Object for storing unsubscribe methods for non-globbed listeners
    this.unsubscribeListener = {};

    if (initialization) initialization.bind(this)();

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
      if (this.regexMatchesEntireName(eventName, handlerName)) {
        this.globbedHandlers[handlerName].forEach(handler => {
          promises.push(handler.bind(this)(data, eventName));
        });
      }
    }
    return Promise.all(promises);
  }

  removeListener(name) {
    if (this.unsubscribeListener[name]) {
      this.unsubscribeListener(name);
    }
    if (this.globbedHandlerLookupTable[name]) {
      this.globbedHandlerLookupTable[name] = null;
    }
  }

  regexMatchesEntireName(eventName, handlerName) {
    const matches = eventName.match(
      this.globbedHandlerLookupTable[handlerName]
    );
    if (!matches) return null;
    const filteredMatches = matches.filter(match => typeof match === "string");
    return filteredMatches.find(filteredMatch => filteredMatch === eventName);
  }

  setUpGlobbedListeners(handlers) {
    const handlerNames = Object.keys(handlers);
    this.globbedHandlerLookupTable = createLookupTable(handlerNames);
    this.emitter.onAny(this.handleEvent.bind(this));
  }

  setUpListeners(handlers) {
    for (let handlerName in handlers) {
      handlers[handlerName].forEach(handler => {
        this.unsubscribeListener[handlerName] = this.emitter.on(
          handlerName,
          handler.bind(this)
        );
      });
    }
  }
}

module.exports = Subscriber;
