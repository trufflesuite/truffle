const Stub = {
  run: async function() {
    console.log("Running truffle-promise-stub!");
    return "Ran promise-stub";
  }
};

module.exports = Stub.run;
