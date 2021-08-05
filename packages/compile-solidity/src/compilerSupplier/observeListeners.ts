export const observeListeners = () => {
  const listeners = new ObservedListeners();

  return listeners;
};


class ObservedListeners {
  private listeners: {
    uncaughtException: Set<NodeJS.UncaughtExceptionListener>;
    unhandledRejection: Set<NodeJS.UnhandledRejectionListener>;
  };

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
      // @ts-expect-error since eventName: string
      for (const listener of process.listeners(eventName)) {
        if (!marked.has(listener)) {
          process.removeListener(eventName, listener);
        }
      }
    }
  }
}

export default observeListeners;
