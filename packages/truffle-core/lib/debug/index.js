const debugModule = require("debug");
const debug = debugModule("lib:debug");

const { DebugPrinter } = require("./printer");
const { DebugInterpreter } = require("./interpreter");

module.exports = {
  DebugPrinter,
  DebugInterpreter
};
