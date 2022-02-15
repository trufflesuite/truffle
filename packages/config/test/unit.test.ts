import assert from "assert";
import TruffleConfig from "../dist";
import { describe, it } from "mocha";

describe("TruffleConfig unit tests", async () => {
  describe("with", async () => {
    let truffleConfig: TruffleConfig;

    beforeEach(() => {
      truffleConfig = TruffleConfig.default();
    });

    it("a simple object", async () => {
      const expectedRandom = 42;
      const expectedFoo = "bar";
      const obj = {
        random: expectedRandom,
        foo: expectedFoo
      };
      const newConfig = truffleConfig.with(obj);
      assert.equal(expectedRandom, newConfig.random);
      assert.equal(expectedFoo, newConfig.foo);
    });

    it("overwrites a known property", () => {
      const expectedProvider = { a: "propertyA", b: "propertyB" };
      const newConfig = truffleConfig.with({ provider: expectedProvider });
      assert.deepEqual(expectedProvider, newConfig.provider);
    });

    it("ignores properties that throw", () => {
      const expectedSurvivor = "BatMan";
      const minefield = { who: expectedSurvivor };

      const hits = ["boom", "pow", "crash", "zonk"];
      hits.forEach(hit => {
        Object.defineProperty(minefield, hit, {
          get() {
            throw new Error("BOOM!");
          },
          enumerable: true //must be enumerable
        });
      });

      const newConfig = truffleConfig.with(minefield);

      //one survivor
      assert.equal(expectedSurvivor, newConfig.who);

      //these jokers shouldn't be included
      hits.forEach(hit => assert.equal(undefined, newConfig[hit]));
    });
  });
});
