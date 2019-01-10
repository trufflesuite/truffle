const LoadingStrategy = require("./LoadingStrategy");

class Native extends LoadingStrategy {
  load() {
    return this.getBuilt("native");
  }
}

module.exports = Native;
