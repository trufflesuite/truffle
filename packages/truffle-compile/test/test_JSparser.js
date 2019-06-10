const path = require("path");
const assert = require("assert");
const Resolver = require("truffle-resolver");
const compile = require("../index");
const { findOne } = require("./helpers");

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

  it("resolves imports when using solcjs parser instead of docker", async () => {
    options.compilers.solc.version = "0.4.22";
    options.compilers.solc.docker = true;
    options.contracts_directory = path.join(__dirname, "./sources/v0.4.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.4.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.4.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    const { contracts } = await compile.with_dependencies(options);
    const ComplexOrdered = findOne("ComplexOrdered", contracts);

    // This contract imports / inherits
    assert(
      ComplexOrdered.contractName === "ComplexOrdered",
      "Should have compiled"
    );
  });

  it("resolves imports when using solcjs parser instead of native solc", async () => {
    options.compilers.solc.version = "native";
    delete options.compilers.solc.docker;
    options.contracts_directory = path.join(__dirname, "./sources/v0.5.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.5.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.5.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    const { contracts } = await compile.with_dependencies(options);
    const ComplexOrdered = findOne("ComplexOrdered", contracts);

    // This contract imports / inherits
    assert(
      ComplexOrdered.contractName === "ComplexOrdered",
      "Should have compiled"
    );
  });

  it("properly throws when passed an invalid parser value", async () => {
    options.compilers.solc.parser = "badParser";
    options.contracts_directory = path.join(__dirname, "./sources/v0.5.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.5.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.5.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    try {
      await compile.with_dependencies(options);
      assert(false, "should not compiled!");
    } catch ({ message }) {
      assert(message.match(/(Unsupported parser)/));
    }
  });
});
