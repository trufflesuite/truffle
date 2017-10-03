#!/usr/bin/env node

var ipc = require("node-ipc");
var TestRPC = require("ethereumjs-testrpc");

// This script takes one argument: A strinified JSON object meant
// to be parsed and then passed to TestRPC.server().

if (process.argv.length <= 2) {
  throw new Error("Fatal: No arguments passed to default environment; please contact the Truffle developers for help.");
}

var options;

try {
  options = JSON.parse(process.argv[2]);
} catch (e) {
  throw new Error("Fatal: Error parsing arguments; please contact the Truffle developers for help.");
}

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

ipc.config.id = 'truffleDevelop';
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
