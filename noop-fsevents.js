const util = require('util');
const { EventEmitter } = require('events');

function nullEmitter() {}

nullEmitter.prototype.start = function() {};

util.inherits(nullEmitter, EventEmitter);

module.exports = nullEmitter;
