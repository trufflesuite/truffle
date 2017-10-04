#!/usr/bin/env node

var IPC = require("node-ipc").IPC;
var TestRPC = require("ethereumjs-testrpc");

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

var server = TestRPC.server(options);

server.listen(options.port, options.hostname, function(err, state) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log("Truffle Develop started.");
  console.log();
});

process.on('uncaughtException', function(e) {
  console.error(e.stack);
  process.exit(1);
})

var ipc = new IPC();

var networkID = 'truffleDevelop';

ipc.config.id = networkID;
ipc.config.retry = 1500;
ipc.config.silent = true;

var connected = 0;

ipc.serve(function() {
  ipc.server.on('connect', function() {
    connected++;
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
