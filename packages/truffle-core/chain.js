#!/usr/bin/env node

var IPC = require("node-ipc").IPC;
var TestRPC = require("ethereumjs-testrpc");
var path = require("path");

/*
 * Options
 */

// This script takes one argument: A strinified JSON object meant
// to be parsed and then passed to TestRPC.server().
var options;
try {
  if (process.argv[2]) {
    options = JSON.parse(process.argv[2]);
  } else {
    options = {};
  }
} catch (e) {
  throw new Error("Fatal: Error parsing arguments; please contact the Truffle developers for help.");
}

options.host = options.host || "localhost";
options.port = options.port || 9545;
options.network_id = options.network_id || 4447;
options.seed = options.seed || "yum chocolate";
options.gasLimit = options.gasLimit || 0x47e7c4;



/*
 * IPC server
 */
function Supervisor(networkID, ipcConfig) {
  var self = this;

  // init IPC
  this.ipc = new IPC();
  this.ipc.config.id = networkID;
  // set config
  Object.keys(ipcConfig).forEach(function(key) {
    self.ipc.config[key] = ipcConfig[key];
  });

  this.mixins = [];
}

Supervisor.prototype.mixin = function(mixin) {
  this.mixins.push(mixin);
};

Supervisor.prototype.start = function() {
  var self = this;

  var ipc = this.ipc;

  // socket filename
  var dirname = ipc.config.socketRoot;
  var basename = `${ipc.config.appspace}${ipc.config.id}`;
  var servePath = path.join(dirname, basename);

  ipc.serve(servePath, function() {
    self.mixins.forEach(function(mixin) {
      if (mixin.start) {
        mixin.start(self);
      }
    });

    ipc.server.on('connect', function(socket) {
      self.mixins.forEach(function(mixin) {
        if (mixin.connect) {
          mixin.connect(self, socket);
        }
      });
    });

    ipc.server.on('socket.disconnected', function() {
      self.mixins.forEach(function(mixin) {
        if (mixin.disconnect) {
          mixin.disconnect(self);
        }
      });
    });
  });

  ipc.server.start();
}

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

Supervisor.prototype.exit = function() {
  var self = this;

  this.ipc.server.stop();
  this.mixins.forEach(function(mixin) {
    if (mixin.exit) {
      mixin.exit(self);
    }
  });
}

/*
 * Lifecycle
 * (quit on last connection)
 */
function LifecycleMixin() {
  var self = this;
}

LifecycleMixin.prototype.start = function(supervisor) {
  this.connections = 0;
};

LifecycleMixin.prototype.connect = function(supervisor) {
  this.connections++;
};

LifecycleMixin.prototype.disconnect = function(supervisor) {
  this.connections--;

  if (this.connections <= 0) {
    supervisor.exit();
  }
};


/*
 * TestRPC Server
 */
function TestRPCMixin(options) {
  this.testrpc = TestRPC.server(options);
}


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

TestRPCMixin.prototype.connect = function(supervisor, socket) {
  var self = this;
  this.ready.then(function() {
    supervisor.emit(socket, 'app.ready');
  });
}

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
 * Process event handling
 */
process.on('uncaughtException', function(e) {
  console.error(e.stack);
  process.exit(1);
})


/*
 * Main
 */
var supervisor = new Supervisor("truffleDevelop", {retry: 1500});
supervisor.mixin(new LifecycleMixin());
supervisor.mixin(new TestRPCMixin(options));
supervisor.start();
