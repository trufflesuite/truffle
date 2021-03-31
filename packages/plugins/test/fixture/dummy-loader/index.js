const Loader = {
  name: "dummy-loader",
  inputLabels: [],
  outputLabels: [],

  execute() {
    return "Successfully called dummy-loader:load()";
  }
};

module.exports = { Loader };
