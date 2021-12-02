#!/usr/bin/env node
require("source-map-support/register");

const IPC = require("node-ipc").IPC;
const Ganache = require("ganache");
const path = require("path");
const debug = require("debug");

/*
 * Loggers
 */
const ipcDebug = debug("chain:ipc");

/*
 * Options
 */

// This script is expected to take two arguments: The first a networkName string,
// the second an options string encoded as base64.
// The options string is decoded, parsed, & then passed to Ganache.server().
const args = process.argv.slice(2);
const ipcNetwork = args[0];
const base64OptionsString = args[1];
const optionsBuffer = Buffer.from(base64OptionsString, "base64");
let optionsString = optionsBuffer.toString();
let options;

try {
  options = JSON.parse(optionsString);
} catch (e) {
  throw new Error(
    "Fatal: Error parsing arguments; please contact the Truffle developers for help."
  );
}

options.time = options.time ? new Date(options.time) : new Date();

// by making vmErrorsOnRPCResponse = true and legacyInstamine = true,
// ganache's error reporting and mining behavior
// is mostly restored to the way it worked in v2.
options.vmErrorsOnRPCResponse = "vmErrorsOnRPCResponse" in options ? options.vmErrorsOnRPCResponse : true;
options.legacyInstamine = "legacyInstamine" in options ? options.legacyInstamine : true;

/*
 * Logging
 */

// constructor
class Logger {
  constructor() {
    this.messages = [];

    this.nextSubscriberID = 1;
    this.subscribers = {};
  }

  // subscribe to log events with provided callback
  // sends prior unsent messages, as well as new messages
  // returns `unsubscribe` cleanup function
  subscribe(callback) {
    // flush messages
    const messages = this.messages;
    this.messages = [];
    messages.forEach(message => {
      callback(message);
    });

    // save subscriber
    const subscriberID = this.nextSubscriberID++;
    this.subscribers[subscriberID] = callback;

    // return cleanup func
    const unsubscribe = () => {
      delete this.subscribers[subscriberID];
    };

    return unsubscribe;
  }

  // log a message to be sent to all active subscribers
  // buffers if there are no active subscribers (to send on first subscribe)
  log(message) {
    const subscriberIDs = Object.keys(this.subscribers);
    if (subscriberIDs.length === 0) {
      this.messages.push(message);

      return;
    }

    subscriberIDs.forEach(subscriberID => {
      const callback = this.subscribers[subscriberID];

      callback(message);
    });
  }
}

/*
 * Supervisor
 */

// constructor - accepts an object to assign to `ipc.config`
class Supervisor {
  constructor(ipcConfig) {
    // init IPC
    this.ipc = new IPC();
    // set config
    Object.keys(ipcConfig).forEach(key => {
      this.ipc.config[key] = ipcConfig[key];
    });

    this.mixins = [];
  }

  // include mixin
  use(mixin) {
    this.mixins.push(mixin);
  }

  // dispatch event to all relevant mixins (ones that define `event` method)
  handle(event, args) {
    args = Array.prototype.slice.call(args);

    this.mixins.forEach(mixin => {
      if (mixin[event]) {
        mixin[event].apply(mixin, [this].concat(args));
      }
    });
  }

  // start the IPC server and hook up all the mixins
  start() {
    const self = this;
    const ipc = this.ipc;

    // socket filename
    const dirname = ipc.config.socketRoot;
    const basename = `${ipc.config.appspace}${ipc.config.id}`;
    const servePath = path.join(dirname, basename);

    ipc.serve(servePath, function() {
      self.handle("start", arguments);

      ipc.server.on("connect", function() {
        self.handle("connect", arguments);
      });

      ipc.server.on("socket.disconnected", function() {
        self.handle("disconnect", arguments);
      });
    });

    ipc.server.start();
  }

  // external interface for mixin to emit socket events
  emit(socket, message, data, options = {}) {
    options.silent = options.silent || false;

    // possibly override silent
    const currentlySilent = this.ipc.config.silent;
    if (options.silent) {
      this.ipc.config.silent = true;
    }

    this.ipc.server.emit(socket, message, data);

    // reset
    this.ipc.config.silent = currentlySilent;
  }

  // external interface for mixin to exit
  exit() {
    this.ipc.server.stop();
    this.handle("exit", arguments);
  }
}

/*
 * Lifecycle
 * (quit on last connection)
 */
class LifecycleMixin {
  // start counting active connections
  start(_supervisor) {
    this.connections = 0;
  }

  // increment
  connect(_supervisor) {
    this.connections++;
  }

  // decrement - invoke supervisor exit if no connections remain
  disconnect(supervisor) {
    this.connections--;

    if (this.connections <= 0) {
      supervisor.exit();
    }
  }
}

/*
 * Ganache Server
 */

// constructor - accepts options for Ganache
class GanacheMixin {
  constructor(options) {
    this.ganache = Ganache.server(options);
  }

  // start Ganache and capture promise that resolves when ready
  start(_supervisor) {
    this.ready = new Promise((accept, reject) => {
      this.ganache.listen(options.port, options.hostname, (err, state) => {
        if (err) {
          reject(err);
        }

        accept(state);
      });
    });
  }

  // wait for Ganache to be ready then emit signal to client socket
  connect(supervisor, socket) {
    this.ready.then(() => {
      supervisor.emit(socket, "truffle.ready");
    });
  }

  // cleanup Ganache process on exit
  exit(_supervisor) {
    this.ganache.close(err => {
      if (err) {
        console.error(err.stack || err);
        process.exit(1);
      } else {
        process.exit();
      }
    });
  }
}

/*
 * Logging over IPC
 */

// constructor - takes Logger instance and message key (e.g. `truffle.ipc.log`)
class LoggerMixin {
  constructor(logger, message) {
    this.logger = logger;
    this.message = message;
  }

  // on connect, subscribe client socket to logger
  connect(supervisor, socket) {
    const unsubscribe = this.logger.subscribe(data => {
      supervisor.emit(socket, this.message, data, { silent: true });
    });

    socket.on("close", unsubscribe);
  }
}

/*
 * Process event handling
 */
process.on("uncaughtException", ({ stack }) => {
  console.error(stack);
  process.exit(1);
});

/*
 * Main
 */
const ipcLogger = new Logger();
const ganacheLogger = new Logger();

const supervisor = new Supervisor({
  appspace: "truffle.",
  id: ipcNetwork,
  retry: 1500,
  logger: ipcLogger.log.bind(ipcLogger)
});

ipcLogger.subscribe(ipcDebug);

options.logger = { log: ganacheLogger.log.bind(ganacheLogger) };

supervisor.use(new LifecycleMixin());
supervisor.use(new GanacheMixin(options));
supervisor.use(new LoggerMixin(ipcLogger, "truffle.ipc.log"));
supervisor.use(new LoggerMixin(ganacheLogger, "truffle.ganache.log"));
supervisor.start();
