const assert = require("assert");
const GlobalNPM = require("../globalnpm");
const global_npm = new GlobalNPM();
const detectInstalled = require("detect-installed");
const get_installed_path = require("get-installed-path");
const sinon = require("sinon");
const path = require("path");
const fs = require("fs");

describe("globalnpm", () => {
  describe("require function", () => {
    let sync_stub;
    let get_installed_path_sync_stub;

    beforeEach(() => {
      sync_stub = sinon.stub(detectInstalled, "sync");
      get_installed_path_sync_stub = sinon.stub(
        get_installed_path,
        "getInstalledPathSync"
      );
    });

    afterEach(() => {
      sync_stub.restore();
      get_installed_path_sync_stub.restore();
    });

    it("should return null if the import_path starts with '.'", () => {
      const result = global_npm.require("./A.sol");
      assert.deepEqual(result, null);
    });

    it("should return null if the import_path is absolute path", () => {
      const result = global_npm.require("/A.sol");
      assert.deepEqual(result, null);
    });

    it("should return the contents of json if the import_path exists", () => {
      sync_stub.withArgs("package").returns(true);
      get_installed_path_sync_stub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const result = global_npm.require("package/contracts/Test.sol");

      assert.deepEqual(result, {});
    });

    it("should return undefined if the import_path does not exist", () => {
      const read_file_sync_stub = sinon.stub(fs, "readFileSync");

      sync_stub.withArgs("package").returns(false);

      const result = global_npm.require("package/contracts/Test.sol");

      assert.ok(!get_installed_path_sync_stub.called);
      assert.deepEqual(result, undefined);

      read_file_sync_stub.restore();
    });

    it("should return null if readFileSync throws Error", () => {
      const read_file_sync_stub = sinon.stub(fs, "readFileSync");

      sync_stub.withArgs("package").returns(true);
      get_installed_path_sync_stub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );
      read_file_sync_stub.throws("some error");

      const result = global_npm.require("package/contracts/Test.sol");

      assert.deepEqual(result, null);

      read_file_sync_stub.restore();
    });
  });

  describe("resolve function", () => {
    let sync_stub;
    let get_installed_path_sync_stub;

    beforeEach(() => {
      sync_stub = sinon.stub(detectInstalled, "sync");
      get_installed_path_sync_stub = sinon.stub(
        get_installed_path,
        "getInstalledPathSync"
      );
    });

    afterEach(() => {
      sync_stub.restore();
      get_installed_path_sync_stub.restore();
    });

    it("should return the contents of solidity file if the import_path exists", () => {
      sync_stub.withArgs("package").returns(true);
      get_installed_path_sync_stub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const callback = (err, body, import_path) => {
        assert.strictEqual(err, null);
        assert.strictEqual(body, "contract Test {}\n");
        assert.strictEqual(import_path, "package/contracts/Test.sol");
      };

      global_npm.resolve(
        "package/contracts/Test.sol",
        "imported_from",
        callback
      );
    });

    it("should return undefined body if the package does not exist", () => {
      sync_stub.withArgs("package").returns(false);
      get_installed_path_sync_stub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const callback = (err, body, import_path) => {
        assert.strictEqual(err, null);
        assert.strictEqual(body, undefined);
        assert.strictEqual(import_path, "package/contracts/Test.sol");
      };

      global_npm.resolve(
        "package/contracts/Test.sol",
        "imported_from",
        callback
      );
    });

    it("should return undefined body if readFileSync throws Error", () => {
      const read_file_sync_stub = sinon.stub(fs, "readFileSync");

      sync_stub.withArgs("package").returns(true);
      get_installed_path_sync_stub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );
      read_file_sync_stub.throws("some error");

      const callback = (err, body, import_path) => {
        assert.strictEqual(err, null);
        assert.strictEqual(body, undefined);
        assert.strictEqual(import_path, "package/contracts/Test.sol");
      };

      global_npm.resolve(
        "package/contracts/Test.sol",
        "imported_from",
        callback
      );

      read_file_sync_stub.restore();
    });
  });
});
