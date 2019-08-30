var Example = artifacts.require("Example");

contract("Example", function(_accounts) {
  it("should assert true", function(done) {
    Example.deployed();
    assert.isTrue(true);
    done();
  });
});
