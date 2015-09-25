contract('Example', function(accounts) {

  it("should add extended functions when created with at()", function(done) {
    Example.extend({
      my_function: function(instance) {
        assert.equal(instance, this, "Function has incorrect scope!");
      }
    });

    assert.isUndefined(Example.my_function, "Function should not have been applied to the class");
    assert.isNotNull(Example._extended.my_function, "Function should have been applied to the _extended attribute");

    var example = Example.at(Example.deployed_address);
    assert.isNotNull(example.my_function, "Function should have been applied to the instance");
    example.my_function(example);
    done();
  });

  it("should add extended functions when created with new()", function(done) {
    Example.extend({
      my_function: function(instance) {
        assert.equal(instance, this, "Function has incorrect scope!");
      }
    });

    Example.new().then(function(example) {
      assert.isNotNull(example.my_function, "Function should have been applied to the instance");
      example.my_function(example);
    }).then(done).catch(done);
  });
});
