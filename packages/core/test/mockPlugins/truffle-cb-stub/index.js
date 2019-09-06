const Stub = {
  run(config, done) {
    process.nextTick(() => {
      console.log("Running truffle-cb-stub!");
      done();
    });
  }
};

module.exports = Stub.run;
