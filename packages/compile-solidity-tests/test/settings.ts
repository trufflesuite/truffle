import { assert } from "chai";
import Config from "@truffle/config";
import { Compile } from "@truffle/compile-solidity";
import { describe, it, before } from "mocha";
import path from "path";
import { Environment } from "@truffle/environment";

let config;
before("Set up config", () => {
  // Load configuration from the fixture file
  config = Config.detect(
    { workingDirectory: path.join(__dirname, "fixture/default-box") },
    "./truffle-config.js"
  );

  // Environment.detect() so we get all the other config goodies
  Environment.detect(config);
});
describe("Compile with disableDefaults flag", () => {
  it("should not add the optimizer when missing if disableDefaults is true", async () => {
    //compile when optimizer is set to false
    const compilationWithOptimizer = await Compile.all(config);

    //get the bytecode for the `optimizer: false` case
    const bytecodeWithOptimizerSetting =
      compilationWithOptimizer.compilations[0].contracts[0].bytecode.bytes;

    //remove the optimizer completely from the settings
    config.compilers.solc.settings = {};

    // Set disableDefaults flag to true in the configuration
    // now Truffle should compile without any optimizer settings
    config.compilers.solc.disableDefaults = true;

    // Compile the contract
    const compilationWithoutOptimizer = await Compile.all(config);

    // Get the bytecode for the compiled contract
    const bytecodeWithDefaultsDisabled =
      compilationWithoutOptimizer.compilations[0].contracts[0].bytecode.bytes;

    // Verify that the bytecode is different
    assert.notStrictEqual(
      bytecodeWithDefaultsDisabled,
      bytecodeWithOptimizerSetting
    );
  });

  it("should add the optimizer when missing if disableDefaults is false", async () => {
    //compile when optimizer is set to false
    const compilationWithOptimizer = await Compile.all(config);

    //get the bytecode for the `optimizer: false` case
    const bytecodeWithOptimizerSetting =
      compilationWithOptimizer.compilations[0].contracts[0].bytecode.bytes;

    //remove the optimizer completely from the settings
    config.compilers.solc.settings = {};

    // Set disableDefaults flag to true in the configuration
    // now Truffle should compile without any optimizer settings
    config.compilers.solc.disableDefaults = false;

    // Compile the contract
    const compilationWithoutOptimizer = await Compile.all(config);

    // Get the bytecode for the compiled contract
    const bytecodeWithDefaultsEnabled =
      compilationWithoutOptimizer.compilations[0].contracts[0].bytecode.bytes;

    // Verify that the bytecode is different
    assert.strictEqual(
      bytecodeWithDefaultsEnabled,
      bytecodeWithOptimizerSetting
    );
  });
});
