var Example = artifacts.require("Example");

contract("Example", function(accounts) {
  it("should assert true", function(done) {
    var example = Example.deployed();
    assert.isTrue(true);
    done();
  });
});
