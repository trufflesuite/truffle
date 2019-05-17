const LoadingStrategy = require("./LoadingStrategy");

class Installed extends LoadingStrategy {
  load() {
    return this.getInstalledSolc();
  }

  getInstalledSolc() {
    this.removeListener();
    return require("solc");
  }
}

module.exports = Installed;
