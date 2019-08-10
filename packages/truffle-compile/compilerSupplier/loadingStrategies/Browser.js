const LoadingStrategy = require("./LoadingStrategy");
const solcWrap = require("solc/wrapper");

class Browser extends LoadingStrategy {
  load() {
    return this.getBrowserSolc();
  }

  getBrowserSolc() {
    this.removeListener();
    // Gross I know. See here: https://github.com/ethereum/solc-js/issues/31
    return solcWrap(window.Module);
  }
}

module.exports = Browser;
