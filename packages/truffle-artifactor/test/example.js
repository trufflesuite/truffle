contract('Example', function(accounts) {

  before("version check", function(done) {
    var pkg = require("../package.json");
    assert.equal(Pudding.version, pkg.version, "Pudding version must match pkg.json version; check your configuration and read 'Running Tests' section of README");
    done();
  });

  it("should get and set values via methods and get values via .call", function(done) {
    var example = Example.deployed();

    example.value.call().then(function(value) {
      assert.equal(value.valueOf(), 1, "Starting value should be 1");
      return example.setValue(5);
    }).then(function(tx) {
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 5, "Ending value should be five");
    }).then(done).catch(done);
  });

  it("should add extended functions when created with at()", function(done) {
    Example.extend({
      my_function: function(instance) {
        assert.equal(instance, this, "Function has incorrect scope!");
        done();
      }
    });

    assert.isUndefined(Example.my_function, "Function should not have been applied to the class");
    assert.isNotNull(Example.prototype.my_function, "Function should have been applied to the _extended attribute");

    var example = Example.at(Example.deployed_address);
    assert.isNotNull(example.my_function, "Function should have been applied to the instance");
    example.my_function(example);
  });

  it("should add extended functions when created with new()", function(done) {
    Example.extend({
      my_function: function(instance) {
        assert.equal(instance, this, "Function has incorrect scope!");
        done();
      }
    });

    Example.new().then(function(example) {
      assert.isNotNull(example.my_function, "Function should have been applied to the instance");
      example.my_function(example);
    }).catch(done);
  });

  it("shouldn't synchronize constant functions", function(done) {
    var example = Example.deployed();
    example.getValue().then(function(value) {
      assert.equal(value.valueOf(), 5, "Value should have been retrieved without explicitly calling .call()");
    }).then(done).catch(done);
  });
});
