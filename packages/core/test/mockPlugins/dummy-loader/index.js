class Loader {
  static help = "Dummy Loader";

  name = "dummy-loader";
  dependencies = [];

  constructor() {}

  load(path, verbose) {
    return `Successfully called dummy-loader:load(${path}, ${verbose})`;
  }
}

module.exports = { Loader };
