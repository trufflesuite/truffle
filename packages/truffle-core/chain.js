#!/usr/bin/env node

var IPC = require("node-ipc").IPC;
var TestRPC = require("ethereumjs-testrpc");
var path = require("path");

function Server(networkID, ipcConfig) {
  var self = this;

  this.ipc = new IPC();

  this.ipc.config.id = networkID;

  // set config
  Object.keys(ipcConfig).forEach(function(key) {
    self.ipc.config[key] = ipcConfig[key];
  });

  // socket filename
}

Server.prototype.start = function(callback) {
  var ipc = this.ipc;

  var dirname = ipc.config.socketRoot;
  var basename = `${ipc.config.appspace}${ipc.config.id}`;
  var servePath = path.join(dirname, basename);

  ipc.serve(servePath, function() { callback(ipc); });

  ipc.server.start();
}

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

process.on('uncaughtException', function(e) {
  console.error(e.stack);
  process.exit(1);
})

var server = new Server("truffleDevelop", {retry: 1500});

server.start(function(ipc) {

  var connected = 0;

  var testrpc = TestRPC.server(options);

  var ready = new Promise(function(accept, reject) {
    testrpc.listen(options.port, options.hostname, function(err, state) {
      if (err) {
        reject(err);
      }

      accept();
    });
  });

  ready.catch(function(err) {
    console.error(err);
    process.exit(1);
  });

  ipc.server.on('connect', function(socket) {
    connected++;

    ready.then(function() {
      ipc.server.emit(socket, 'app.ready');
    });
  });

  ipc.server.on('socket.disconnected', function() {
    connected--;

    if (connected <= 0) {
      ipc.server.stop();
      testrpc.close(function(err) {
        if (err) {
          console.error(err.stack || err);
          process.exit(1);
        } else {
          process.exit();
        }
      });
    }
  });
});
