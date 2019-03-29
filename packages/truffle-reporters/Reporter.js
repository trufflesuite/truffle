class Reporter {
  constructor({ emitter, options }) {
    const { initialization, handlers } = options;

    this.emitter = emitter;

    if (initialization) initialization.bind(this)();
    if (typeof handlers !== "object" || Object.keys(handlers).length === 0) {
      this.throwNoHandlersError(handlers);
    }

    const { globbedHandlers, nonGlobbedHandlers } = this.sortHandlers(handlers);
    if (nonGlobbedHandlers) this.setUpListeners(nonGlobbedHandlers);
    if (globbedHandlers) {
      this.globbedHandlers = globbedHandlers;
      this.setUpGlobbedListeners(globbedHandlers);
    }
  }

  convertHandlerNameToRegex(name) {
    return new RegExp(
      name.replace(
        /\*\*|\*/g, // match single or double `*`
        match => {
          return match === "**" ? "([^:]+(:[^:]+)*)?" : "[^:]+";
        }
      )
    );
  }

  handleEvent(eventName, data) {
    for (let handlerName in this.globbedHandlerLookupTable) {
      if (this.regexMatchesEntireName(eventName, handlerName)) {
        this.globbedHandlers[handlerName].forEach(handler => {
          handler.bind(this, data)();
        });
      }
    }
  }

  createLookupTable(handlerNames) {
    return handlerNames.reduce((lookupTable, handlerName) => {
      const regex = this.convertHandlerNameToRegex(handlerName);
      lookupTable[handlerName] = regex;
      return lookupTable;
    }, {});
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
    this.globbedHandlerLookupTable = this.createLookupTable(handlerNames);
    this.emitter.onAny(this.handleEvent);
  }

  setUpListeners(handlers) {
    for (let handlerName in handlers) {
      handlers[handlerName].forEach(handler => {
        this.emitter.on(handlerName, handler.bind(this));
      });
    }
  }

  sortHandlers(handlers) {
    const globbedHandlers = {};
    const nonGlobbedHandlers = {};
    for (let handlerName in handlers) {
      if (handlerName.includes("*") || handlerName.includes("**")) {
        globbedHandlers[handlerName] = handlers[handlerName];
      } else {
        nonGlobbedHandlers[handlerName] = handlers[handlerName];
      }
    }
    return { nonGlobbedHandlers, globbedHandlers };
  }

  throwNoHandlersError(handlers) {
    const message =
      `You must provide a handlers property in your reporter ` +
      `config. Please ensure that the handlers property ` +
      ` exists and is in the following form:\n ` +
      `  handlers: {\n` +
      `    <handlerName1>: [\n` +
      `       handler1,\n` +
      `       handler2,\n` +
      `       ...\n` +
      `     ],\n` +
      `     <handlerName2>: [\n` +
      `       ...\n` +
      `Currently the handlers property is ${handlers}.`;
    throw new Error(message);
  }
}

module.exports = Reporter;
