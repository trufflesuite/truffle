import { normalize, stringify } from "../../lib/targets";
import { tests } from "./utils.fixture";

describe("stringify()", () => {
  for (const { name, raw, normalized, stringified } of tests) {
    describe(`test: ${name}`, () => {
      it("should stringify raw target", async () => {
        const result = await stringify(raw);
        expect(result).toEqual(stringified);
      });

      it("should stringify normalized target", async () => {
        const result = await stringify(normalized);
        expect(result).toEqual(stringified);
      });
    });
  }
});

describe("normalize()", () => {
  for (const { name, raw, normalized, stringified } of tests) {
    describe(`test: ${name}`, () => {
      it("should normalize raw target", async () => {
        const result = normalize(raw);
        expect(JSON.stringify(result)).toEqual(JSON.stringify(normalized));
      });

      it("should normalize stringified target", async () => {
        const result = normalize(stringified);
        expect(JSON.stringify(result)).toEqual(JSON.stringify(normalized));
      });
    });
  }
});
