const solc = require("solc");
const LoadingStrategy = require("./LoadingStrategy");

class Bundled extends LoadingStrategy {
  load() {
    return this.getBundledSolc();
  }

  getBundledSolc() {
    this.removeListener();
    return solc;
  }
}

module.exports = Bundled;
