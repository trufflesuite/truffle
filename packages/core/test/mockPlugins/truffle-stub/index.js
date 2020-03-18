const Stub = {
  run() {
    console.log("Running truffle-stub!");
    return "Ran fake plugin";
  }
};

module.exports = Stub.run;
