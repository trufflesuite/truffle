const Stub = {
  run(config, done) {
    console.log("Running truffle-other-stub!");
    done();
  }
};

module.exports = Stub.run;
