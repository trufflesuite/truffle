const path = require("path");
const assert = require("assert");
const Resolver = require("truffle-resolver");
const compile = require("../index");

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

  it("resolves imports quickly when using solcjs parser instead of docker [ @native ]", done => {
    options.compilers.solc.version = "0.4.22";
    options.compilers.solc.docker = true;
    options.contracts_directory = path.join(__dirname, "./sources/v0.4.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.4.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.4.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    compile.with_dependencies(options, (err, result) => {
      if (err) return done(err);

      // This contract imports / inherits
      assert(
        result["ComplexOrdered"].contract_name === "ComplexOrdered",
        "Should have compiled"
      );
      done();
    });
  }).timeout(5000);

  it("resolves imports quickly when using solcjs parser instead of native solc", done => {
    options.compilers.solc.version = "native";
    delete options.compilers.solc.docker;
    options.contracts_directory = path.join(__dirname, "./sources/v0.5.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.5.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.5.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    compile.with_dependencies(options, (err, result) => {
      if (err) return done(err);

      // This contract imports / inherits
      assert(
        result["ComplexOrdered"].contract_name === "ComplexOrdered",
        "Should have compiled"
      );
      done();
    });
  }).timeout(5000);

  it("properly throws when passed an invalid parser value", done => {
    options.compilers.solc.parser = "badParser";
    options.contracts_directory = path.join(__dirname, "./sources/v0.5.x");

    const paths = [];
    paths.push(path.join(__dirname, "./sources/v0.5.x/ComplexOrdered.sol"));
    paths.push(path.join(__dirname, "./sources/v0.5.x/InheritB.sol"));

    options.paths = paths;
    options.resolver = new Resolver(options);

    compile.with_dependencies(options, (err, result) => {
      if (result) {
        assert(false, "should have failed!");
        done();
      }

      assert(err.message.match(/(Unsupported parser)/));
      done();
    });
  }).timeout(3000);
});
