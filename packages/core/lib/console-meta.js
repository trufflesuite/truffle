const Table = require("cli-table3");
const util = require("util");

// Modify TruffleContract's prototype to play nicer with REPL
function shockTheMonkey(contract) {
  const TruffleContract = contract.__internal_tc;
  const customInspect = Symbol.for("nodejs.util.inspect.custom");

  let _memoVerbosity = false;

  function setCustomInspectPrototype() {
    TruffleContract.prototype[customInspect] = function () {
      const table = new Table({
        head: ["function", "selector", "stateMutability", "constant"]
      });

      this.abi
        .filter(a => a.type === "function")
        .forEach(abi => {
          table.push([
            abi.name,
            abi.signature,
            abi.stateMutability,
            abi.constant ? "constant" : ""
          ]);
        });

      return (
        table.toString() +
        `\n${this.constructor.contractName} deployed at: ${this.address}`
      );
    };
  }

  setCustomInspectPrototype();

  TruffleContract.prototype.toggleFormat = function () {
    _memoVerbosity = !_memoVerbosity;
    if (_memoVerbosity) {
      delete TruffleContract.prototype[customInspect];
    } else {
      setCustomInspectPrototype();
    }
  };

  // See https://nodejs.org/dist/latest-v19.x/docs/api/util.html#utilinspectobject-options
  const defaultOptions = {
    depth: null,
    showHidden: false,
    depth: 2,
    colors: true,
    //customInspect you cannot se this
    showProxy: false,
    maxArrayLength: 100,
    maxStringLength: 10000,
    breakLength: 80,
    compact: 3,
    numericSeparator: true
  };

  TruffleContract.prototype.asObject = function (options = defaultOptions) {
    return console.log(
      util.inspect(this, { ...options, customInspect: false })
    );
  };
}

module.exports = shockTheMonkey;
