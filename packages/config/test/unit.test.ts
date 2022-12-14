import assert from "assert";
import TruffleConfig from "../dist";
import { describe, it } from "mocha";

describe("TruffleConfig unit tests", async () => {
  let truffleConfig: TruffleConfig;

  describe("Defaults", async () => {
    before(() => {
      truffleConfig = TruffleConfig.default();
    });

    it("solidityLog", () => {
      const expectedSolidityLog = {
        displayPrefix: "",
        preventConsoleLogMigration: false
      };
      assert.deepStrictEqual(truffleConfig.solidityLog, expectedSolidityLog);
    });
  }),
    describe("with", async () => {
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
        assert.strictEqual(expectedRandom, newConfig.random);
        assert.strictEqual(expectedFoo, newConfig.foo);
      });

      it("overwrites a known property", () => {
        const expectedProvider = { a: "propertyA", b: "propertyB" };
        const newConfig = truffleConfig.with({ provider: expectedProvider });
        assert.deepStrictEqual(expectedProvider, newConfig.provider);
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
        assert.strictEqual(expectedSurvivor, newConfig.who);

        //these jokers shouldn't be included
        hits.forEach(hit => assert.strictEqual(undefined, newConfig[hit]));
      });
    });
});
