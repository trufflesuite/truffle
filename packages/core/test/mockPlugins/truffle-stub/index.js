const Stub = {
  run(config, done) {
    console.log("Running truffle-stub!");
    done();
  }
};

module.exports = Stub.run;
