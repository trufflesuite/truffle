// @ts-ignore
import TestCase from "mocha/lib/test.js";
// @ts-ignore
import Suite from "mocha/lib/suite.js";
import Deployer from "@truffle/deployer";
import { Compile } from "@truffle/compile-solidity";
import { Shims } from "@truffle/compile-common";
import type { Compilation, CompiledContract } from "@truffle/compile-common";
import debugModule from "debug";
const debug = debugModule("lib:testing:soliditytest");

export const SolidityTest = {
  async define(
    abstraction: any,
    dependencyPaths: string[],
    runner: any,
    mocha: any
  ) {
    const self = this;

    const suite = new Suite(abstraction.contract_name, {});
    suite.timeout(runner.beforeTimeout);

    // Set up our runner's needs first.
    suite.beforeAll("prepare suite", async function () {
      // This compiles some native contracts (including the assertion library
      // contracts) which need to be compiled before initializing the runner
      await self.compileNewAbstractInterface.bind(this)(runner);
      await runner.initialize.bind(runner)();
      runner.disableChecksOnEventDecoding(); //for handling of test events on Solidity <0.7.6 due to empty string problem
      await self.deployTestDependencies.bind(this)(
        abstraction,
        dependencyPaths,
        runner
      );
    });

    suite.afterAll("clean up", function () {
      runner.reEnableChecksOnEventDecoding();
    });

    suite.beforeEach("before test", async function () {
      await runner.startTest(this);
    });

    // Function that checks transaction logs to see if a test failed.
    async function checkResultForFailure(result: any) {
      const logs = result.receipt.rawLogs;
      for (const log of logs) {
        const decodings = await runner.decoder.decodeLog(log, {
          disableChecks: true
        });
        for (const decoding of decodings) {
          //check: is this a TestEvent?
          //note: we don't check the argument names
          if (
            decoding.abi.name === "TestEvent" &&
            decoding.arguments.length === 2 &&
            decoding.arguments[0].value.type.typeClass === "bool" &&
            decoding.arguments[0].indexed &&
            decoding.arguments[1].value.type.typeClass === "string" &&
            !decoding.arguments[1].indexed
          ) {
            //if so: did the test fail?
            if (!decoding.arguments[0].value.value.asBoolean) {
              //if so: extract the message
              let messageDecoding = decoding.arguments[1].value;
              let message;
              switch (messageDecoding.value.kind) {
                case "valid":
                  message = messageDecoding.value.asString;
                  break;
                case "malformed":
                  //use buffer to convert hex to string
                  //(this causes malformed UTF-8 to become U+FFFD)
                  message = Buffer.from(
                    messageDecoding.value.asHex.slice(2),
                    "hex"
                  ).toString();
              }
              throw new Error(message);
            }
          }
        }
      }
    }

    // Add functions from test file.
    for (const item of abstraction.abi) {
      if (item.type !== "function") {
        continue;
      }

      const hookTypes = ["beforeAll", "beforeEach", "afterAll", "afterEach"];
      for (const hookType of hookTypes) {
        if (item.name.startsWith(hookType)) {
          suite[hookType](item.name, async () => {
            let deployed = await abstraction.deployed();
            await checkResultForFailure(await deployed[item.name]());
          });
        }
      }

      if (item.name.startsWith("test")) {
        const test = new TestCase(item.name, async () => {
          let deployed = await abstraction.deployed();
          await checkResultForFailure(await deployed[item.name]());
        });

        test.timeout(runner.testTimeout);
        suite.addTest(test);
      }
    }

    suite.afterEach("after test", async function () {
      await runner.endTest(this);
    });

    mocha.suite.addSuite(suite);
  },

  async compileNewAbstractInterface(runner: any) {
    debug("compiling");
    const config = runner.config;

    const truffleLibraries = [
      "truffle/Assert.sol",
      "truffle/AssertAddress.sol",
      "truffle/AssertAddressArray.sol",
      "truffle/AssertBalance.sol",
      "truffle/AssertBool.sol",
      "truffle/AssertBytes32.sol",
      "truffle/AssertBytes32Array.sol",
      "truffle/AssertGeneral.sol",
      "truffle/AssertInt.sol",
      "truffle/AssertIntArray.sol",
      "truffle/AssertString.sol",
      "truffle/AssertUint.sol",
      "truffle/AssertUintArray.sol",
      "truffle/DeployedAddresses.sol",
      "truffle/SafeSend.sol",
      "truffle/Console.sol"
    ];

    const { compilations } = await Compile.sourcesWithDependencies({
      paths: truffleLibraries,
      options: runner.config.with({
        quiet: true
      })
    });
    const contracts = compilations.reduce(
      (a: CompiledContract[], compilation: Compilation) => {
        return a.concat(compilation.contracts);
      },
      []
    );

    // Set network values.
    for (let contract of contracts) {
      contract.network_id = config.network_id;
      contract.default_network = config.default_network;
    }

    await config.artifactor.saveAll(
      contracts.map(Shims.NewToLegacy.forContract)
    );
    debug("compiled");
  },

  async deployTestDependencies(
    abstraction: any,
    dependencyPaths: string[],
    runner: any
  ) {
    debug("deploying %s", abstraction.contract_name);
    const deployer = new Deployer(
      runner.config.with({
        logger: { log() {} }
      })
    );

    debug("starting deployer");
    await deployer.start();

    const testLibraries = [
      "Assert",
      "AssertAddress",
      "AssertAddressArray",
      "AssertBalance",
      "AssertBool",
      "AssertBytes32",
      "AssertBytes32Array",
      "AssertGeneral",
      "AssertInt",
      "AssertIntArray",
      "AssertString",
      "AssertUint",
      "AssertUintArray",
      "DeployedAddresses",
      "Console"
    ];

    const testAbstractions = testLibraries.map(name =>
      runner.config.resolver.require(`truffle/${name}.sol`)
    );

    const SafeSend = runner.config.resolver.require("SafeSend");

    debug("deploying test libs");
    for (const testLib of testAbstractions) {
      await deployer.deploy(testLib);
      await deployer.link(testLib, abstraction);
    }

    debug("linking dependencies");
    for (const dependencyPath of dependencyPaths) {
      const dependency = runner.config.resolver.require(dependencyPath);

      if (dependency.isDeployed()) {
        await deployer.link(dependency, abstraction);
      }
    }

    debug("deploying contract");
    await deployer.deploy(abstraction);
    const deployed = await abstraction.deployed();
    let balance;
    if (deployed.initialBalance) {
      balance = await deployed.initialBalance.call();
    } else {
      balance = 0;
    }

    if (balance !== 0) {
      await deployer.deploy(SafeSend);
      const safeSend = await SafeSend.deployed();
      await safeSend.deliver(deployed.address, { value: balance });
    }

    debug("deployed %s", abstraction.contract_name);
  }
};
