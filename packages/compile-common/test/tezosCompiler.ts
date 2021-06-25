import assert from "assert";
import { ICompileStrategy, TezosCompiler } from "../src";

describe("Common Tezos Compiler tests", () => {
  let tezosCompiler: TezosCompiler;

  before(() => {
    const mockCompileStrategy: ICompileStrategy = {
      compiler: "mock-compiler",
      fileExtensions: ["mockext"],
      compile: () => Promise.resolve(null)
    };

    tezosCompiler = new TezosCompiler(mockCompileStrategy);
  });

  it("Instantiates correctly", () => {
    assert.ok(tezosCompiler);
  });

  // it("calling all compiles all files from findContracts", async () => {
  //   const options = {
  //   };

  //   const result = tezosCompiler.all(options);
  // });
});
