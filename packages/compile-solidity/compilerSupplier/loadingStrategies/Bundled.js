const LoadingStrategy = require("./LoadingStrategy");

class Bundled extends LoadingStrategy {
  load() {
    return this.getBundledSolc();
  }

  getBundledSolc() {
    this.removeListener();
    return require("solc");
  }
}

module.exports = Bundled;
