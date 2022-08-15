import * as path from "path";
import { assert } from "chai";
import { Resolver } from "@truffle/resolver";
import { Compile } from "@truffle/compile-solidity";
import Config from "@truffle/config";
let options;

describe("JSparser", () => {
  beforeEach(function () {
    options = {
      compilers: {
        solc: {
          parser: "solcjs",
          settings: {
            optimizer: {
              enabled: false,
              runs: 200
            }
          },
          version: undefined,
          docker: undefined
        }
      },
      quiet: true,
      contracts_directory: undefined,
      contracts_build_directory: path.join(__dirname, "./build"),
      working_directory: __dirname
    };
  });

  it("resolves imports when using solcjs parser instead of docker [ @native ]", async function () {
    this.timeout(20000);
    options.compilers.solc.version = "0.4.22";
    options.compilers.solc.docker = true;
    options.contracts_directory = path.join(__dirname, "./sources/v0.4.x");

    const paths: string[] = [];
    paths.push(path.join(__dirname, "./sources/v0.4.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.4.x/InheritB.sol"));

    options.resolver = new Resolver(options);

    const config = Config.default().merge(options);

    const { compilations } = await Compile.sourcesWithDependencies({
      paths,
      options: config
    });
    const contractWasCompiled = compilations.some(compilation => {
      return compilation.contracts.some(contract => {
        return contract.contractName === "ComplexOrdered";
      });
    });

    // This contract imports / inherits
    assert(contractWasCompiled, "Should have compiled");
  });

  it("properly throws when passed an invalid parser value", async function () {
    this.timeout(3000);
    options.compilers.solc.parser = "badParser";
    options.contracts_directory = path.join(__dirname, "./sources/v0.5.x");

    const paths: string[] = [];
    paths.push(path.join(__dirname, "./sources/v0.5.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.5.x/InheritB.sol"));

    options.resolver = new Resolver(options);

    const config = Config.default().merge(options);

    try {
      await Compile.sourcesWithDependencies({
        paths,
        options: config
      });
      assert(false, "this call should have failed!");
    } catch (error) {
      assert(error.message.match(/(Unsupported parser)/));
    }
  });
});
