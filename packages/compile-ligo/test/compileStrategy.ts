import { TezosCompiledContract } from "@truffle/compile-common";
import Config from "@truffle/config";
const Resolver = require("@truffle/resolver");
import assert from "assert";
import path from "path";

import { Compile } from "../src/index";

describe("ligo compiler", function () {
  this.timeout(20000);

  const defaultSettings = {
    contracts_directory: path.join(__dirname, "./sources/"),
    quiet: true,
    all: true,
  };
  const config = new Config().merge(defaultSettings);
  config.resolver = new Resolver(config);

  it("compiles ligo contract", async function () {
    const { compilations } = await Compile.all(config);
    const { contracts, sourceIndexes } = compilations[0];

    sourceIndexes.forEach(path => {
      assert(path.endsWith(".ligo") || path.endsWith(".religo") || path.endsWith(".mligo"), "Paths have only ligo files");
    });

    contracts.forEach(contract => {
      assert.strictEqual(contract.architecture, "tezos", "Contract architecture is tezos");
      assert(contract.compiler.name.includes("ligo"), "Compiler name is correct");
      assert.doesNotThrow(() => JSON.parse((contract as TezosCompiledContract).michelson), "Generates valid Michelson");
    });

    assert.strictEqual(contracts.length, 1, "Correct number of contracts compiled. Skips other extensions.");
  });
});
