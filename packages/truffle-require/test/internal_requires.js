var Require = require("../");
var path = require("path");
var assert = require("assert");
var mocha = require("mocha"); // Used as an example of a locally installed module.

describe("Require", function() {

  it("allows internal require statements for globally installed modules", function(done) {
    Require.file({
      file: path.join(__dirname, "lib", "module_with_global_require.js")
    }, function(err, exports) {
      if (err) return done(err);

      // It should export a function. Call the function.
      var obj = exports();

      // It should return the path object. This should be the same object
      // as the one we required at the top of this file.
      assert.equal(obj, path);

      done();
    });
  });

  it("allows require statements for local files", function(done) {
    Require.file({
      file: path.join(__dirname, "lib", "module_with_local_file_require.js")
    }, function(err, exports) {
      if (err) return done(err);

      // It should export a function, which, since we're using the global require in
      // the file, should be a function that returns the same function exported
      // in the test above.
      var module_with_global_require = exports();

      // Let's ride this train all the way down to path.
      var obj = module_with_global_require();

      // It should return the path object. This should be the same object
      // as the one we required at the top of this file.
      assert.equal(obj, path);

      done();
    });
  });

  it("allows require statements for locally install modules (node_modules)", function(done) {
    Require.file({
      file: path.join(__dirname, "lib", "module_with_local_module_require.js")
    }, function(err, exports) {
      if (err) return done(err);

      // It should export a function. Call the function.
      var obj = exports();

      // It should return the mocha object. This should be the same object
      // as the one we required at the top of this file.
      assert.equal(obj, mocha);

      done();
    });
  });
})
