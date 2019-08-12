// Looks like Truffle's using an undocumented API. It doesn't matter
// for us in the browser, so let's shim it.
class Module {}

Module._resolveFilename = function() {
  return "";
};

module.exports = Module;
