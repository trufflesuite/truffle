class Reporter {
  // const supportedEvents = { compile: compileEvents, unbox: unboxEvents };
  // const defaultReporters = { compileReporter, unboxReporter };
  constructor({ options, emitter, events }) {
    const { initialization, handlers } = options;
    this.logger = console;
    this.emitter = emitter;
    if (initialization) initialization.bind(this)();
    if (handlers) {
      this.attachListeners(handlers, events);
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

  attachListeners(handlers, events) {
    const handlerNames = Object.keys(handlers);
    handlerNames.forEach(handlerName => {
      const relevantEventNames = this.determineMatchingEventNames(
        handlerName,
        events
      );
      if (relevantEventNames.length > 1) {
        relevantEventNames.forEach(relevantEventName => {
          this.attachListener(relevantEventName, handlers[handlerName]);
        });
      } else if (relevantEventNames.length === 1) {
        this.attachListener(relevantEventNames[0], handlers[handlerName]);
      } else {
        console.log(
          `The event name you have supplied, ${handlerName}, ` +
            `doesn't match any events.`
        );
        console.log(
          `Please ensure that the name you provided in your ` +
            `reporter configuration is one of ${events.join(", ")} or can ` +
            `be mapped to at least one of them with the wildcard characters ` +
            `"*" and "**".`
        );
      }
    });
  }

  convertInputToRegex(name) {
    return new RegExp(
      name.replace(
        /\*([^*])|\*\*/g, // match single or double `*`
        (match, char) => {
          // char is whatever follows a single `*`
          return match === "**" ? "([^:]+(:[^:]+)*)?" : `[^:]+${char}`; // ensure char still remains (since it's part of match)
        }
      )
    );
  }

  determineMatchingEventNames(name, events) {
    if (events.includes(name)) return [name];
    const regex = this.convertInputToRegex(name);
    return this.matchingEvents(regex, events);
  }

  matchingEvents(regex, events) {
    return events.reduce((matchingEvents, event) => {
      if (regex.test(event)) {
        return matchingEvents.concat(event);
      }
      return matchingEvents;
    }, []);
  }
}

module.exports = Reporter;
