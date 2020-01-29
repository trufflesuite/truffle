const util = require("util");

const Stub = {
  run: util.promisify(function() {
    console.log("Running truffle-promise-stub!");
  })
};

module.exports = Stub.run;
