import { TezosCompiledContract } from "@truffle/compile-common";
import Config from "@truffle/config";
const Resolver = require("@truffle/resolver");
import assert from "assert";
import path from "path";

import { Compile } from "../src/index";

describe("michelson compiler", function () {
  this.timeout(20000);

  const defaultSettings = {
    contracts_directory: path.join(__dirname, "./sources/"),
    quiet: true,
    all: true,
  };
  const config = new Config().merge(defaultSettings);
  config.resolver = new Resolver(config);

  it("compiles michelson contract", async function () {
    const { compilations } = await Compile.all(config);
    const { contracts, sourceIndexes } = compilations[0];

    sourceIndexes.forEach(path => {
      assert(path.endsWith(".tz"), "Paths have only Michelson files");
    });

    contracts.forEach(contract => {
      assert.strictEqual(contract.architecture, "tezos", "Contract architecture is tezos");
      assert.strictEqual(contract.compiler.name, "@truffle/compile-michelson", "Compiler name is correct");
      assert.doesNotThrow(() => JSON.parse((contract as TezosCompiledContract).michelson), "Generates valid Michelson");
    });

    assert.strictEqual(contracts.length, 2, "Correct number of Michelson contracts compiled. Skips other extensions.");
  });
});
