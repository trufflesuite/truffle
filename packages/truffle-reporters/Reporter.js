class Reporter {
  constructor({ initialization, handlers }) {
    this.logger = console;
    this.handlers = handlers;

    if (initialization) initialization.bind(this)();

    if (handlers) {
      const handlerNames = Object.keys(handlers);
      this.handlerLookupTable = this.setUpLookupTable(handlerNames);
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
    for (let regex in this.handlerLookupTable) {
      if (regex.test(eventName)) {
        const handlerName = this.handlerLookupTable[regex];
        this.handlers[handlerName](data);
      }
    }
  }

  setUpLookupTable(handlerNames) {
    return handlerNames.reduce((lookupTable, handlerName) => {
      const regex = this.convertHandlerNameToRegex(handlerName);
      lookupTable[regex] = handlerName;
      return lookupTable;
    }, {});
  }
}

module.exports = Reporter;
