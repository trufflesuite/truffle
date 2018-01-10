var Debugger = require("./lib/debugger");

if ( typeof window !== "undefined" ) {
  window.Debugger = Debugger;
}

module.exports = Debugger;

