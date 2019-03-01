class Reporter {
  constructor({ options, emitter }) {
    const { initialization } = options;
    console.log("in the reporter initialization");
    this.logger = console;
    this.emitter = emitter;
    if (initialization) initialization();
    console.log("about to build");
    this.buildReporter(options);
  }

  attachListener(name, handler) {
    console.log("attaching listener --> %o", name);
    console.log("the function is --> %s", handler);
    this.emitter.on(name, handler.bind(this));
  }

  attachListeners(reporterDescription, currentNamespace) {
    console.log("about to attach listeners--- cnsp %o", currentNamespace);
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
    // testing
    let newName = currentNamespace ? `${currentNamespace}:${name}` : name;
    console.log("the cn --> %o -- name --> %o", currentNamespace, name);
    console.log("the new namespace is --> %o", newName);
    //testing
    return currentNamespace ? `${currentNamespace}:${name}` : name;
  }

  buildReporter(reporterDescription) {
    console.log("in the build");
    this.attachListeners(reporterDescription, null);
  }
}

module.exports = Reporter;
