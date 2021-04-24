import "jest-extended";
import { testProp } from "jest-fast-check";

import * as Arbitrary from "./arbitrary";

import { normalize } from "./normalize";

describe("normalize", () => {
  testProp(
    `fills in "type" property for function entries`,
    [Arbitrary.Abi()],
    looseAbi => {
      const abi = normalize(looseAbi);

      expect(abi).toSatisfyAll(entry => "type" in entry);
    }
  );

  testProp(
    `never includes "payable" or "constant"`,
    [Arbitrary.Abi()],
    looseAbi => {
      const abi = normalize(looseAbi);

      expect(abi).toSatisfyAll(entry => !("payable" in entry));
      expect(abi).toSatisfyAll(entry => !("constant" in entry));
    }
  );

  testProp(
    `always includes "outputs" for function entries`,
    [Arbitrary.Abi()],
    looseAbi => {
      const abi = normalize(looseAbi);

      expect(abi.filter(({ type }) => type === "function")).toSatisfyAll(
        entry => "outputs" in entry
      );
      expect(abi).toSatisfyAll(entry => !("constant" in entry));
    }
  );

  testProp(
    `always includes "stateMutability" for entries that aren't events or errors`,
    [Arbitrary.Abi()],
    looseAbi => {
      const abi = normalize(looseAbi);

      expect(
        abi.filter(({ type }) => type !== "event" && type !== "error")
      ).toSatisfyAll(
        entry => "stateMutability" in entry
      );
    }
  );

  testProp("is idempotent", [Arbitrary.Abi()], looseAbi => {
    const abi = normalize(looseAbi);

    expect(normalize(abi)).toEqual(abi);
  });
});
