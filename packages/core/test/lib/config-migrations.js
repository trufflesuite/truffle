const migrationUtils = require("../../lib/config-migration");
const {
  migrateTruffleDataIfNecessary,
  needsMigrated,
  oldTruffleDataDirectory,
} = migrationUtils;
const assert = require("assert");
const path = require("path");
const sinon = require("sinon");
const fse = require("fs-extra");
const oldConfigPath = path.join(oldTruffleDataDirectory, "config.json");

describe("global config migrations", function () {
  describe("needsMigrated", function () {
    describe("when the user has no old-style data dir", function () {
      beforeEach(function () {
        sinon.stub(fse, "existsSync").withArgs(oldConfigPath).returns(false);
      });
      afterEach(function () {
        fse.existsSync.restore();
      });

      it("returns false", function () {
        assert.equal(migrationUtils.needsMigrated(), false);
      });
    });
  });
});
