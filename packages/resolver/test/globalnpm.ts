import assert from "assert";
const detectInstalled: any = require("detect-installed");
const getInstalledPath: any = require("get-installed-path");
import * as sinon from "sinon";
import path from "path";
import fs from "fs";
import { describe, it } from "mocha";

import { GlobalNPM } from "../lib/sources/globalnpm";
const globalNpm = new GlobalNPM();

describe("globalnpm", () => {
  describe("require function", () => {
    let syncStub: sinon.SinonStub;
    let getInstalledPathSyncStub: sinon.SinonStub;

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

    it("returns null if the import_path starts with '.'", () => {
      const result = globalNpm.require("./A.sol");
      assert.deepEqual(result, null);
    });

    it("returns null if the import_path is absolute path", () => {
      const result = globalNpm.require("/A.sol");
      assert.deepEqual(result, null);
    });

    it("returns the contents of json (in build/contracts)", () => {
      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const result = globalNpm.require("package/Test.sol");

      console.log(result);
      assert.deepEqual(result, {});
    });

    it("returns the contents of json (in build dir)", () => {
      syncStub.withArgs("otherPackage").returns(true);
      getInstalledPathSyncStub
        .withArgs("otherPackage")
        .returns(
          path.resolve(
            __dirname,
            "fixtures/globalnpm/node_modules/otherPackage"
          )
        );

      const result = globalNpm.require("otherPackage/OtherTest.sol");

      assert.deepEqual(result.wallace, "grommit");
    });

    it("returns undefined if the import_path does not exist", () => {
      const read_file_sync_stub = sinon.stub(fs, "readFileSync");

      syncStub.withArgs("package").returns(false);

      const result = globalNpm.require("package/contracts/Test.sol");

      assert.ok(!getInstalledPathSyncStub.called);
      assert.deepEqual(result, undefined);

      read_file_sync_stub.restore();
    });

    it("returns null if readFileSync throws Error", () => {
      const readFileSyncStub = sinon.stub(fs, "readFileSync");

      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );
      readFileSyncStub.throws("some error");

      const result = globalNpm.require("package/contracts/Test.sol");

      assert.deepEqual(result, null);

      readFileSyncStub.restore();
    });
  });

  describe("resolve function", () => {
    let syncStub: sinon.SinonStub;
    let getInstalledPathSyncStub: sinon.SinonStub;

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

    it("returns the contents of solidity file if the import_path exists", async () => {
      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const { body, filePath } = await globalNpm.resolve(
        "package/contracts/Test.sol"
      );

      assert.strictEqual(body, "contract Test {}\n");
      assert.strictEqual(filePath, "package/contracts/Test.sol");
    });

    it("returns undefined body if the package does not exist", async () => {
      syncStub.withArgs("package").returns(false);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );

      const { body, filePath } = await globalNpm.resolve(
        "package/contracts/Test.sol"
      );

      assert.strictEqual(body, undefined);
      assert.strictEqual(filePath, "package/contracts/Test.sol");
    });

    it("returns undefined body if readFileSync throws Error", async () => {
      const readFileSyncStub = sinon.stub(fs, "readFileSync");

      syncStub.withArgs("package").returns(true);
      getInstalledPathSyncStub
        .withArgs("package")
        .returns(
          path.resolve(__dirname, "fixtures/globalnpm/node_modules/package")
        );
      readFileSyncStub.throws("some error");

      const { body, filePath } = await globalNpm.resolve(
        "package/contracts/Test.sol"
      );

      assert.strictEqual(body, undefined);
      assert.strictEqual(filePath, "package/contracts/Test.sol");

      readFileSyncStub.restore();
    });
  });
});
