var ExtendableError = require("./extendableerror");
var inherits = require("util").inherits;

inherits(TaskError, ExtendableError);

function TaskError(message) {
  TaskError.super_.call(this, message);
};

module.exports = TaskError;
