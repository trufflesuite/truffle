class Reporter {
  constructor({ initialization, handlers }) {
    this.logger = console;
    this.handlers = handlers;

    if (initialization) initialization.bind(this)();

    if (this.handlers) {
      const handlerNames = Object.keys(handlers);
      this.handlerLookupTable = this.createLookupTable(handlerNames);
    } else {
      const message =
        `You must provide a handlers property in your reporter ` +
        `config. Please ensure that the handlers property ` +
        ` exists. Current the handlers property is ${handlers}.`;
      throw new Error(message);
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
    for (let handlerName in this.handlerLookupTable) {
      if (this.regexMatchesEntireName(eventName, handlerName)) {
        this.handlers[handlerName].forEach(handler => {
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
    const matches = eventName.match(this.handlerLookupTable[handlerName]);
    if (!matches) return null;
    const filteredMatches = matches.filter(match => typeof match === "string");
    return filteredMatches.find(filteredMatch => filteredMatch === eventName);
  }
}

module.exports = Reporter;
