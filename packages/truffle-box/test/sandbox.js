const { sandbox } = require("../");
const assert = require("assert");

describe("Box.sandbox", () => {
  let options;

  it("successfully unboxes and returns TruffleConfig when passed a valid options object", done => {
    options = { name: "default", force: true };
    sandbox(options, (err, config) => {
      if (err) done(err);
      assert(config);
      assert(config.truffle_directory);
      done();
    });
  });

  it("errors when passed an invalid options configuration", done => {
    options = { name: "badBox", force: true, setGracefulCleanup: true };
    return sandbox(options, (err, config) => {
      if (err) {
        assert(err);
        assert(!config);
        assert(err.message.match(/(Truffle Box).*(doesn't exist)/g));
        done();
      }
    });
    assert(false, "should have thrown!");
  });
});
