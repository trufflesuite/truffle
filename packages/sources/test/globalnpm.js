const assert = require("assert");
const GlobalNPM = require("../globalnpm");
const globalNPM = new GlobalNPM();
const detectInstalled = require("detect-installed");
const getInstalledPath = require("get-installed-path");
const sinon = require("sinon");
const path = require("path");
const fs = require("fs");

describe("globalnpm", () => {
  describe("require function", () => {
    let syncStub;
    let getInstalledPathSyncStub;

    beforeEach(() => {
      syncStub = sinon.stub(detectInstalled, "sync");
      getInstalledPathSyncStub = sinon.stub(
        getInstalledPath,
        "getInstalledPathSync"
      );
    });

    afterEach(() => {
      syncStub.restore();
      getInstalledPathSyncStub.restore();
    });

    it("should return null if the import_path starts with '.'", () => {
      const result = globalNPM.require("./A.sol");
      assert.deepEqual(result, null);
    });

    it("should return null if the import_path is absolute path", () => {
      const result = globalNPM.require("/A.sol");
      assert.deepEqual(result, null);
    });

    it("should return the contents of json if the import_path exists", () => {
      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const result = globalNPM.require("package/contracts/Test.sol");

      assert.deepEqual(result, {});
    });

    it("should return undefined if the import_path does not exist", () => {
      const readFileSyncStub = sinon.stub(fs, "readFileSync");

      syncStub.withArgs("package").returns(false);

      const result = globalNPM.require("package/contracts/Test.sol");

      assert.ok(!getInstalledPathSyncStub.called);
      assert.deepEqual(result, undefined);

      readFileSyncStub.restore();
    });

    it("should return null if readFileSync throws Error", () => {
      const readFileSyncStub = sinon.stub(fs, "readFileSync");

      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );
      readFileSyncStub.throws("some error");

      const result = globalNPM.require("package/contracts/Test.sol");

      assert.deepEqual(result, null);

      readFileSyncStub.restore();
    });
  });

  describe("resolve function", () => {
    let syncStub;
    let getInstalledPathSyncStub;

    beforeEach(() => {
      syncStub = sinon.stub(detectInstalled, "sync");
      getInstalledPathSyncStub = sinon.stub(
        getInstalledPath,
        "getInstalledPathSync"
      );
    });

    afterEach(() => {
      syncStub.restore();
      getInstalledPathSyncStub.restore();
    });

    it("should return the contents of solidity file if the import_path exists", () => {
      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const { body, filePath } = globalNPM.resolve(
        "package/contracts/Test.sol",
        "imported_from"
      );
      assert.strictEqual(body, "contract Test {}\n");
      assert.strictEqual(filePath, "package/contracts/Test.sol");
    });

    it("should return undefined body if the package does not exist", () => {
      syncStub.withArgs("package").returns(false);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const { body, filePath } = globalNPM.resolve(
        "package/contracts/Test.sol",
        "imported_from"
      );
      assert.strictEqual(body, undefined);
      assert.strictEqual(filePath, "package/contracts/Test.sol");
    });

    it("should return undefined body if readFileSync throws Error", () => {
      const readFileSyncStub = sinon.stub(fs, "readFileSync");

      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );
      readFileSyncStub.throws("some error");

      const { body, filePath } = globalNPM.resolve(
        "package/contracts/Test.sol",
        "imported_from"
      );

      assert.strictEqual(body, undefined);
      assert.strictEqual(filePath, "package/contracts/Test.sol");
      readFileSyncStub.restore();
    });
  });
});
