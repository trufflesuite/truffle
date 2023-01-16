import path from "path";
import assert from "assert";
import sinon from "sinon";
import type { SinonStub } from "sinon";

import { WebpackTestHelper } from "../dist";

import type someInternalModule from "../dist/someInternalModule";
import type { Debug } from "debug";

// using `require` here as a dirty hack so I don't need to come up with types
// for this
const expectedWebpackRequire = require("../dist/runtime") as (
  id: string
) => any;

describe("WebpackTestHelper", () => {
  describe("constructor", () => {
    it("should resolve the package root correctly", () => {
      const expectedPackageRoot = path.resolve(__dirname, "..");
      const helper = new WebpackTestHelper("@truffle/webpack-test-helper");
      const actualPackageRoot = (helper as any).packageRoot;

      assert.strictEqual(actualPackageRoot, expectedPackageRoot);
    });

    it("should find the correct webpack resolve function", () => {
      const helper = new WebpackTestHelper("@truffle/webpack-test-helper");
      const actualWebpackRequire = (helper as any).webpackRequire;

      assert.deepStrictEqual(
        actualWebpackRequire,
        expectedWebpackRequire,
        "WebpackTestHelper imported some function other than the expected " +
          "`__webpack_require__` function from the target bundle"
      );
    });
  });
  describe("require", () => {
    describe("internal modules", () => {
      it("should resolve internal bundled modules from their relative build path", () => {
        const helper = new WebpackTestHelper("@truffle/webpack-test-helper");
        const bundledSomeInternalModule = helper.require<
          typeof someInternalModule
        >("./build/someInternalModule.js");

        // check that it returns _something_
        assert.notStrictEqual(bundledSomeInternalModule, undefined);
        assert.notStrictEqual(bundledSomeInternalModule, null);

        // check that the thing it returns has the expected members
        assert.strictEqual(bundledSomeInternalModule.constString, "bar");

        assert.strictEqual(typeof bundledSomeInternalModule.foo, "function");
        assert.strictEqual(bundledSomeInternalModule.foo.name, "foo");
        assert.strictEqual(bundledSomeInternalModule.foo(), "bar");

        assert.strictEqual(
          typeof bundledSomeInternalModule.usesDebugModule,
          "function"
        );
        assert.strictEqual(
          bundledSomeInternalModule.usesDebugModule.name,
          "usesDebugModule"
        );
        assert.strictEqual(
          bundledSomeInternalModule.usesDebugModule.length,
          0,
          "expected `usesDebugModule` function shouldn't expect any arguments"
        );
      });

      it("should allow you to stub internal modules", () => {
        const helper = new WebpackTestHelper("@truffle/webpack-test-helper");
        const stubMe = helper.require<typeof someInternalModule>(
          "./build/someInternalModule.js"
        );

        sinon.stub(stubMe, "foo").returns("baz");

        try {
          // reimport it here just to simulate a scenario where the stub is
          // applied in a beforeEach function
          const bundledSomeInternalModule = helper.require<
            typeof someInternalModule
          >("./build/someInternalModule.js");

          assert.notStrictEqual(
            (bundledSomeInternalModule.foo as SinonStub).called,
            undefined,
            "expected `foo` to be a stub"
          );
          assert.strictEqual(
            (bundledSomeInternalModule.foo as SinonStub).called,
            false,
            "expected `foo` to not have been called yet"
          );
          assert.strictEqual(
            bundledSomeInternalModule.foo(),
            "baz",
            "expected `foo()` to return the stubbed value"
          );
          assert.strictEqual(
            (bundledSomeInternalModule.foo as SinonStub).called,
            true,
            "expected `foo` to have been called"
          );
        } finally {
          // make sure we always put things back the way we found them
          (stubMe.foo as SinonStub).restore();
        }
      });
    });

    describe("bundled dependencies", () => {
      it("should resolve bundled dependencies by their idiomatic module id", () => {
        const helper = new WebpackTestHelper("@truffle/webpack-test-helper");
        const bundledDebugModule = helper.require<Debug>("debug");

        assert.strictEqual(typeof bundledDebugModule, "function");
        assert.strictEqual(bundledDebugModule.name, "createDebug");

        // not going to exhaustively check all members, but let's check one more just to be sure
        assert.strictEqual(typeof bundledDebugModule.enable, "function");
        assert.strictEqual(bundledDebugModule.enable.name, "enable");
      });
    });
  });
});
