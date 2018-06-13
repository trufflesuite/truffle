#!/usr/bin/env node

var IPC = require("node-ipc").IPC;
var TestRPC = require("ganache-cli");
var path = require("path");
var debug = require("debug");

/*
 * Loggers
 */
var ipcDebug = debug("chain:ipc");


/*
 * Options
 */

// This script takes one argument: A strinified JSON object meant
// to be parsed and then passed to TestRPC.server().
var ipcNetwork;
var options;

var args = process.argv.slice(2);
if (args.length == 2) {
  ipcNetwork = args[0];
  options = args[1];
} else if (args.length == 1) {
  ipcNetwork = "develop";
  options = args[0];
} else {
  ipcNetwork = "develop";
  options = "{}";
}

try {
  options = JSON.parse(options);
} catch (e) {
  throw new Error("Fatal: Error parsing arguments; please contact the Truffle developers for help.");
}

options.host = options.host || "127.0.0.1";
options.port = options.port || 9545;
options.network_id = options.network_id || 4447;
options.mnemonic = options.mnemonic || "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
options.gasLimit = options.gasLimit || 0x47e7c4;


/*
 * Logging
 */

// constructor
function Logger() {
  this.messages = [];

  this.nextSubscriberID = 1;
  this.subscribers = {};
}

// subscribe to log events with provided callback
// sends prior unsent messages, as well as new messages
// returns `unsubscribe` cleanup function
Logger.prototype.subscribe = function(callback) {
  var self = this;

  // flush messages
  var messages = this.messages;
  this.messages = [];
  messages.forEach(function(message) {
    callback(message);
  });

  // save subscriber
  var subscriberID = this.nextSubscriberID++;
  this.subscribers[subscriberID] = callback;

  // return cleanup func
  var unsubscribe = function() {
    delete self.subscribers[subscriberID];
  };

  return unsubscribe;
};

// log a message to be sent to all active subscribers
// buffers if there are no active subscribers (to send on first subscribe)
Logger.prototype.log = function(message) {
  var self = this;

  var subscriberIDs = Object.keys(this.subscribers)
  if (subscriberIDs.length == 0) {
    this.messages.push(message);

    return;
  }

  subscriberIDs.forEach(function(subscriberID) {
    var callback = self.subscribers[subscriberID];

    callback(message);
  });
};


/*
 * Supervisor
 */

// constructor - accepts an object to assign to `ipc.config`
function Supervisor(ipcConfig) {
  var self = this;

  // init IPC
  this.ipc = new IPC();
  // set config
  Object.keys(ipcConfig).forEach(function(key) {
    self.ipc.config[key] = ipcConfig[key];
  });

  this.mixins = [];
}

// include mixin
Supervisor.prototype.use = function(mixin) {
  this.mixins.push(mixin);
};

// dispatch event to all relevant mixins (ones that define `event` method)
Supervisor.prototype.handle = function(event, args) {
  var self = this;

  args = Array.prototype.slice.call(args);

  this.mixins.forEach(function(mixin) {
    if (mixin[event]) {
      mixin[event].apply(mixin, [self].concat(args));
    }
  });
};

// start the IPC server and hook up all the mixins
Supervisor.prototype.start = function() {
  var self = this;

  var ipc = this.ipc;

  // socket filename
  var dirname = ipc.config.socketRoot;
  var basename = `${ipc.config.appspace}${ipc.config.id}`;
  var servePath = path.join(dirname, basename);

  ipc.serve(servePath, function() {
    self.handle('start', arguments);

    ipc.server.on('connect', function() {
      self.handle('connect', arguments);
    });

    ipc.server.on('socket.disconnected', function() {
      self.handle('disconnect', arguments);
    });
  });

  ipc.server.start();
}

// external interface for mixin to emit socket events
Supervisor.prototype.emit = function(socket, message, data, options) {
  options = options || {};
  options.silent = options.silent || false;

  // possibly override silent
  var currentlySilent = this.ipc.config.silent;
  if (options.silent) {
    this.ipc.config.silent = true;
  }

  this.ipc.server.emit(socket, message, data);

  // reset
  this.ipc.config.silent = currentlySilent;
};

// external interface for mixin to exit
Supervisor.prototype.exit = function() {
  this.ipc.server.stop();
  this.handle('exit', arguments);
}


/*
 * Lifecycle
 * (quit on last connection)
 */
function LifecycleMixin() {
  var self = this;
}

// start counting active connections
LifecycleMixin.prototype.start = function(supervisor) {
  this.connections = 0;
};

// increment
LifecycleMixin.prototype.connect = function(supervisor) {
  this.connections++;
};

// decrement - invoke supervisor exit if no connections remain
LifecycleMixin.prototype.disconnect = function(supervisor) {
  this.connections--;

  if (this.connections <= 0) {
    supervisor.exit();
  }
};


/*
 * TestRPC Server
 */

// constructor - accepts options for TestRPC
function TestRPCMixin(options) {
  this.testrpc = TestRPC.server(options);
}

// start TestRPC and capture promise that resolves when ready
TestRPCMixin.prototype.start = function(supervisor) {
  var self = this;

  this.ready = new Promise(function(accept, reject) {
    self.testrpc.listen(options.port, options.hostname, function(err, state) {
      if (err) {
        reject(err);
      }

      accept(state);
    });
  });
};

// wait for TestRPC to be ready then emit signal to client socket
TestRPCMixin.prototype.connect = function(supervisor, socket) {
  var self = this;
  this.ready.then(function() {
    supervisor.emit(socket, 'truffle.ready');
  });
}

// cleanup TestRPC process on exit
TestRPCMixin.prototype.exit = function(supervisor) {
  this.testrpc.close(function(err) {
    if (err) {
      console.error(err.stack || err);
      process.exit(1);
    } else {
      process.exit();
    }
  });
};


/*
 * Logging over IPC
 */

// constructor - takes Logger instance and message key (e.g. `truffle.ipc.log`)
function LoggerMixin(logger, message) {
  this.logger = logger;
  this.message = message;
}

// on connect, subscribe client socket to logger
LoggerMixin.prototype.connect = function(supervisor, socket) {
  var self = this;

  var unsubscribe = this.logger.subscribe(function(data) {
    supervisor.emit(socket, self.message, data, {silent: true});
  });

  socket.on('close', unsubscribe);
};


/*
 * Process event handling
 */
process.on('uncaughtException', function(e) {
  console.error(e.stack);
  process.exit(1);
})


/*
 * Main
 */
var ipcLogger = new Logger();
var testrpcLogger = new Logger();

var supervisor = new Supervisor({
  appspace: "truffle.",
  id: ipcNetwork,
  retry: 1500,
  logger: ipcLogger.log.bind(ipcLogger)
});

ipcLogger.subscribe(ipcDebug);

options.logger = {log: testrpcLogger.log.bind(testrpcLogger)};

supervisor.use(new LifecycleMixin());
supervisor.use(new TestRPCMixin(options));
supervisor.use(new LoggerMixin(ipcLogger, 'truffle.ipc.log'));
supervisor.use(new LoggerMixin(testrpcLogger, 'truffle.testrpc.log'));
supervisor.start();
