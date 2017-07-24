var OS = require("os");
var streamBuffers = require('stream-buffers');
var Console = require("console").Console;

function MemoryLogger(pipe) {
  this.pipe = !!pipe;
  this.stream = new streamBuffers.WritableStreamBuffer();
  this.console = new Console(this.stream);
};

MemoryLogger.prototype.log = function() {
  this.console.log.apply(this.console, arguments);

  if (this.pipe) {
    console.log.apply(console, arguments);
  }
};

MemoryLogger.prototype.includes = function(val) {
  return this.contents().indexOf(val) >= 0;
};

MemoryLogger.prototype.contents = function() {
  return this.stream.getContentsAsString('utf8');
};

module.exports = MemoryLogger;
