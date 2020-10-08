import { testProp } from "jest-fast-check";

import * as Arbitrary from "./arbitrary";

import { normalize } from "./normalize";

describe("normalize", () => {
  testProp(
    `fills in "type" property for function entries`,
    [Arbitrary.Abi()],
    looseAbi => {
      const abi = normalize(looseAbi);

      expect(abi.find(entry => !entry.type)).toBeUndefined();
    }
  );

  testProp(
    `never includes "payable" or "constant"`,
    [Arbitrary.Abi()],
    looseAbi => {
      const abi = normalize(looseAbi);

      expect(
        abi.find(entry => "payable" in entry || "constant" in entry)
      ).toBeUndefined();
    }
  );

  testProp(
    `always includes "stateMutability" for entries that aren't events`,
    [Arbitrary.Abi()],
    looseAbi => {
      const abi = normalize(looseAbi);

      expect(
        abi.find(entry => entry.type !== "event" && !entry.stateMutability)
      ).toBeUndefined();
    }
  );

  testProp("is idempotent", [Arbitrary.Abi()], looseAbi => {
    const abi = normalize(looseAbi);

    expect(normalize(abi)).toEqual(abi);
  });
});
