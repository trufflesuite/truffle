const path = require("path");
const assert = require("assert");
const Resolver = require("@truffle/resolver");
const compile = require("../");
const Config = require("@truffle/config");

describe("JSparser", () => {
  const options = {
    compilers: {
      solc: {
        parser: "solcjs",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200
          }
        }
      }
    },
    quiet: true,
    contracts_build_directory: path.join(__dirname, "./build"),
    working_directory: __dirname
  };

  it("resolves imports when using solcjs parser instead of docker [ @native ]", async () => {
    options.compilers.solc.version = "0.4.22";
    options.compilers.solc.docker = true;
    options.contracts_directory = path.join(__dirname, "./sources/v0.4.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.4.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.4.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    const config = Config.default().merge(options);

    const result = await compile.with_dependencies(config);

    // This contract imports / inherits
    assert(
      result["ComplexOrdered"].contract_name === "ComplexOrdered",
      "Should have compiled"
    );
  }).timeout(20000);

  it("properly throws when passed an invalid parser value", async () => {
    options.compilers.solc.parser = "badParser";
    options.contracts_directory = path.join(__dirname, "./sources/v0.5.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.5.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.5.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    const config = Config.default().merge(options);

    try {
      await compile.with_dependencies(config);
      assert(false, "this call should have failed!");
    } catch (error) {
      assert(error.message.match(/(Unsupported parser)/));
    }
  }).timeout(3000);
});
