const ora = require("ora");
const helpers = require("./helpers");
const { createLookupTable, sortHandlers, validateOptions } = helpers;
const Writable = require("stream").Writable;

class Subscriber {
  constructor({ emitter, options, config }) {
    validateOptions(options);
    const { initialization, handlers } = options;

    this.emitter = emitter;
    // Object for storing unsubscribe methods for non-globbed listeners
    this.unsubscribeListeners = {};
    this.quiet = config.quiet;
    this.config = config;

    Object.defineProperty(this, "logger", {
      get: () => {
        if (!this._logger) {
          this.logger = this.config.logger || console;
        }
        return this._logger;
      },
      set: logger => {
        this._logger = {
          log: ((...args) => {
            if (this.quiet) {
              return;
            }
            logger.log(...args);
          }).bind(this),
          error: ((...args) => {
            if (this.quiet) {
              return;
            }
            logger.error(...args);
          }).bind(this)
        };
      }
    });

    if (initialization) {
      initialization.bind(this)(config);
    }

    const { globbedHandlers, nonGlobbedHandlers } = sortHandlers(handlers);

    if (nonGlobbedHandlers) {
      this.setUpListeners(nonGlobbedHandlers);
    }

    if (globbedHandlers) {
      this.globbedHandlers = globbedHandlers;
      this.setUpGlobbedListeners(globbedHandlers);
    }
  }

  handleEvent(eventName, data) {
    let promises = [];
    for (let handlerName in this.globbedHandlerLookupTable) {
      if (this.globbedHandlerLookupTable[handlerName].test(eventName)) {
        this.globbedHandlers[handlerName].forEach(handler => {
          promises.push(handler.bind(this)(data, eventName));
        });
      }
    }
    return Promise.all(promises);
  }

  removeListener(name) {
    if (this.unsubscribeListeners.hasOwnProperty(name)) {
      this.unsubscribeListeners[name]();
    }
    if (this.globbedHandlerLookupTable[name]) {
      delete this.globbedHandlerLookupTable[name];
    }
  }

  setUpGlobbedListeners(handlers) {
    const handlerNames = Object.keys(handlers);
    this.globbedHandlerLookupTable = createLookupTable(handlerNames);
    this.emitter.onAny(this.handleEvent.bind(this));
  }

  setUpListeners(handlers) {
    for (let handlerName in handlers) {
      handlers[handlerName].forEach(handler => {
        this.unsubscribeListeners[handlerName] = this.emitter.on(
          handlerName,
          handler.bind(this)
        );
      });
    }
  }

  updateOptions(config) {
    this.config = config;
    if (config.quiet) {
      this.quiet = true;
    }
    if (config.logger) {
      this.logger = config.logger;
    }
  }
  getSpinner(options) {
    if (typeof options === "string") {
      options = {
        text: options
      };
    }

    return ora({
      ...options,
      stream: new Writable({
        write: function (chunk, encoding, next) {
          this.logger.log(chunk.toString());
          next();
        }.bind(this)
      })
    });
  }
}

module.exports = Subscriber;
