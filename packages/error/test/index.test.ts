import { TruffleError } from "@truffle/error";
import assert from "assert";

describe("@truffle/error", () => {
  describe("cause", () => {
    it("should have a cause property when a cause is given", () => {
      const cause = new Error("inner");
      const err = new TruffleError("outer", { cause });
      assert.strictEqual(err.cause, cause);
    });

    it("should not have a cause property when no cause is given", () => {
      const err = new TruffleError("outer");
      assert.strictEqual(err.cause, undefined);
    });
  });

  describe("stack", () => {
    it("should combine stack traces when given an underlying cause", () => {
      const cause = new Error("inner");
      const err = new TruffleError("outer", { cause });
      assert(err.stack);
      assert(err.stack.includes(`Caused by: ${cause.stack}`));
    });
    it("should not include extra text when no cause is given", () => {
      const err = new TruffleError("outer");
      assert(err.stack);
      assert(!err.stack.includes(`Caused by`));
    });
    it("should be assignable (for solidity stack trace feature)", () => {
      const err = new TruffleError("outer");
      err.stack = "foo";
      assert.strictEqual(err.stack, "foo");
    });
    it("should still combine stack traces even when stack has been overwritten", () => {
      const cause = new Error("inner");
      const err = new TruffleError("outer", { cause });
      err.stack = "foo";
      assert.strictEqual(err.stack, `foo\nCaused by: ${cause.stack}`);
    });
  });

  describe("name", () => {
    it("should be the name of the class", () => {
      const err = new TruffleError("outer");
      assert.strictEqual(err.name, "TruffleError");
    });

    it("should be the name of the child class", () => {
      class ChildError extends TruffleError {}
      const err = new ChildError("outer");
      assert.strictEqual(err.name, "ChildError");
    });
  });

  describe("message", () => {
    it("should propagate the error message when passed into the constructor", () => {
      const err = new TruffleError("outer");
      assert(err.message);
      assert.strictEqual(err.message, "outer");
    });

    it("should not change the message when constructed with a cause", () => {
      const cause = new Error("inner");
      const err = new TruffleError("outer", { cause });
      assert(err.message);
      assert.strictEqual(err.message, "outer");
    });
  });

  describe("instanceof operator", () => {
    it("should be an instance of TruffleError", () => {
      const err = new TruffleError("outer");
      assert(err instanceof TruffleError);
    });

    it("should be an instance of Error", () => {
      const err = new TruffleError("outer");
      assert(err instanceof Error);
    });

    it("should be extensible and still work with the instanceof operator", () => {
      class TestError extends TruffleError {}
      const err = new TestError("outer");
      assert(err instanceof TestError);
      assert(err instanceof TruffleError);
      assert(err instanceof Error);
    });
  });
});
