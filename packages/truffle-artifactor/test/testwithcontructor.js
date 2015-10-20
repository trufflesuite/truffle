contract('TestWithConstructor', function(accounts) {

  it("Should allow array parameters in constructors", function(done) {
    TestWithConstructor.new(accounts[1], [1,2,3]).then(function(instance) {
      assert.isNotNull(instance, "Should have received a proper instance");
    }).then(done).catch(done);
  });
});
