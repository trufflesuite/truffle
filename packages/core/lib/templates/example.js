const Example = artifacts.require("Example");

contract("Example", function() {
  it("should assert true", async function(done) {
    await Example.deployed();
    assert.isTrue(true);
    done();
  });
});
