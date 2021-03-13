class Loader {
  constructor() {
    this.name = "dummy-loader";
    this.dependencies = [];
  }

  load(path, verbose) {
    return `Successfully called dummy-loader:load(${path}, ${verbose})`;
  }
}

Loader.help = "Dummy Loader";

module.exports = { Loader };
