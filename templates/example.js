contract('Example', function(accounts) {
  it("should assert true", function(done) {
    var example = Example.at(Example.deployed_address);
    assert.isTrue(true);
    done();
  });
});
