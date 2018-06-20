const assert = require('assert');
const NPM = require('../npm');
const npm = new NPM();
describe('npm', function() {
  describe('#require()', function() {
    it('reads package name', function() {
      let result = npm.require('package/Test', './test/fixtures');
      assert.deepEqual(result, {});
    });

    it('reads package name with /', function() {
      let result = npm.require('@org/package/Test', './test/fixtures');
      assert.deepEqual(result, {});
    });
  });
});
