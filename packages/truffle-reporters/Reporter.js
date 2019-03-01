class Reporter {
  constructor({ options, emitter }) {
    const { initialization } = options;
    this.logger = console;
    this.emitter = emitter;
    if (initialization) initialization.bind(this)();
    this.buildReporter(options);
  }

  attachListener(name, handler) {
    this.emitter.on(name, handler.bind(this));
  }

  attachListeners(reporterDescription, currentNamespace) {
    const { name, handlers, namespaces } = reporterDescription;
    if (handlers && name) {
      const eventName = this.buildName(currentNamespace, name);
      handlers.forEach(handler => {
        this.attachListener(eventName, handler);
      });
    }

    if (namespaces && namespaces.length > 0) {
      namespaces.forEach(namespace => {
        const newNamespace = this.buildName(currentNamespace, name);
        this.attachListeners(namespace, newNamespace);
      });
    }
  }

  buildName(currentNamespace, name) {
    return currentNamespace ? `${currentNamespace}:${name}` : name;
  }

  buildReporter(reporterDescription) {
    this.attachListeners(reporterDescription, null);
  }
}

module.exports = Reporter;
