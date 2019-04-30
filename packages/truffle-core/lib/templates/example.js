const Example = artifacts.require("Example");

contract("Example", function(_accounts) {
  it("asserts true", async function(done) {
    await Example.deployed();
    assert.isTrue(true);
    done();
  });
});
