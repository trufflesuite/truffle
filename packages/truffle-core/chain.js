#!/usr/bin/env node

var IPC = require("node-ipc").IPC;
var TestRPC = require("ethereumjs-testrpc");
var path = require("path");

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

var ipc = new IPC();

var networkID = 'truffleDevelop';

ipc.config.id = networkID;
ipc.config.retry = 1500;

var serverPath = path.join(
  ipc.config.socketRoot, `${ipc.config.appspace}${networkID}`
);

var connected = 0;

ipc.serve(serverPath, function() {
  var server = TestRPC.server(options);

  var ready = new Promise(function(accept, reject) {
    server.listen(options.port, options.hostname, function(err, state) {
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
      server.close(function(err) {
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

ipc.server.start();
