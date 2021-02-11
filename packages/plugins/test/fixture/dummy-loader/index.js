const Loader = {
  name: "dummy-loader",
  dependencies: [],

  load() {
    return "Successfully called dummy-loader:load()";
  }
};

module.exports = { Loader };
