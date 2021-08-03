const observeListeners = () => {
  const listeners = new ObservedListeners();

  return listeners;
};

class ObservedListeners {
  constructor() {
    this.listeners = {
      uncaughtException: new Set(process.listeners("uncaughtException")),
      unhandledRejection: new Set(process.listeners("unhandledRejection")),
    };
  }

  /**
   * Cleans up error listeners left by soljson
   */
  cleanup() {
    for (const eventName in this.listeners) {
      const marked = this.listeners[eventName];
      for (const listener of process.listeners(eventName)) {
        if (!marked.has(listener)) {
          process.removeListener(eventName, listener);
        }
      }
    }
  }
}

module.exports = observeListeners;
