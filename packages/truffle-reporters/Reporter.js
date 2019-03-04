class Reporter {
  constructor({ options, emitter }) {
    const { initialization, handlers } = options;
    this.logger = console;
    this.emitter = emitter;
    if (initialization) initialization.bind(this)();
    if (handlers) {
      this.attachListeners(handlers);
    } else {
      const message =
        `You must provide a handlers property in your reporter ` +
        `config. Please ensure that the handlers property ` +
        ` exists. Current the handlers property is ${handlers}.`;
      throw new Error(message);
    }
  }

  attachListener(name, handler) {
    this.emitter.on(name, handler.bind(this));
  }

  attachListeners(handlers) {
    const handlerNames = Object.keys(handlers);
    handlerNames.forEach(handlerName => {
      this.attachListener(handlerName, handlers[handlerName]);
    });
  }
}

module.exports = Reporter;
