const { sandbox } = require("../");
const assert = require("assert");

describe("Box.sandbox", () => {
  let options;

  it("successfully unboxes and returns TruffleConfig when passed a valid options object", async () => {
    options = { name: "default", force: true };
    const config = await sandbox(options);
    assert(config);
    assert(config.truffle_directory);
  });

  it("errors when passed an invalid options configuration", () => {
    options = { name: "badBox", force: true, setGracefulCleanup: true };
    assert.rejects(async () => {
      await sandbox(options);
    }, "should have rejected!");
  });
});
