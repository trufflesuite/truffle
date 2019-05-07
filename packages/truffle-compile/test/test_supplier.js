const debug = require("debug")("compile:test:test_supplier");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Resolver = require("truffle-resolver");
const compile = require("../index");
const Config = require("truffle-config");

function waitSecond() {
  return new Promise(resolve => setTimeout(() => resolve(), 1250));
}

describe("CompilerSupplier", function() {
  describe("integration", function() {
    this.timeout(40000);
    let oldPragmaPinSource; //  0.4.15
    let oldPragmaFloatSource; // ^0.4.15
    let version4PragmaSource; // ^0.4.21
    let version5PragmaSource; // ^0.5.0

    const options = {
      contracts_directory: "",
      solc: "",
      quiet: true
    };

    before("get code", function() {
      const oldPragmaPin = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.15/OldPragmaPin.sol"),
        "utf-8"
      );
      const oldPragmaFloat = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.x/OldPragmaFloat.sol"),
        "utf-8"
      );
      const version4Pragma = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.x/NewPragma.sol"),
        "utf-8"
      );
      const version5Pragma = fs.readFileSync(
        path.join(__dirname, "./sources/v0.5.x/Version5Pragma.sol"),
        "utf-8"
      );

      oldPragmaPinSource = { "OldPragmaPin.sol": oldPragmaPin };
      oldPragmaFloatSource = { "OldPragmaFloat.sol": oldPragmaFloat };
      version4PragmaSource = { "NewPragma.sol": version4Pragma };
      version5PragmaSource = { "Version5Pragma.sol": version5Pragma };
    });

    it("compiles w/ default solc if no compiler specified (float)", function(done) {
      const defaultOptions = Config.default().merge(options);

      compile(version5PragmaSource, defaultOptions, (err, result) => {
        if (err) return done(err);
        debug("result %o", result);

        assert(result["Version5Pragma"].contract_name === "Version5Pragma");
        done();
      });
    });

    it("compiles w/ remote solc when options specify release (pinned)", function(done) {
      options.compilers = {
        solc: {
          version: "0.4.15",
          settings: {}
        }
      };

      compile(oldPragmaPinSource, options, (err, result) => {
        if (err) return done(err);

        assert(result["OldPragmaPin"].contract_name === "OldPragmaPin");
        done();
      });
    });

    it("compiles w/ remote solc when options specify prerelease (float)", function(done) {
      this.timeout(20000);
      // An 0.4.16 prerelease for 0.4.15
      options.compilers = {
        solc: {
          version: "0.4.16-nightly.2017.8.9+commit.81887bc7",
          settings: {}
        }
      };

      compile(oldPragmaFloatSource, options, (err, result) => {
        if (err) {
          assert(false);
          done();
        }

        assert(result["OldPragmaFloat"].contract_name === "OldPragmaFloat");
        done();
      });
    });

    it("compiles w/ local path solc when options specify path", function(done) {
      const pathToSolc = path.join(
        __dirname,
        "../../../node_modules/solc/index.js"
      );

      options.compilers = {
        solc: {
          version: pathToSolc
        }
      };

      const localPathOptions = Config.default().merge(options);

      compile(version5PragmaSource, localPathOptions, (err, result) => {
        if (err) return done(err);

        assert(result["Version5Pragma"].contract_name === "Version5Pragma");
        done();
      });
    });

    it("caches releases and uses them if available", function(done) {
      let initialAccessTime;
      let finalAccessTime;

      const compilerCacheDirectory = path.resolve(
        Config.getTruffleDataDirectory(),
        "compilers/node_modules"
      );
      const expectedCache = path.resolve(
        compilerCacheDirectory,
        "soljson-v0.4.21+commit.dfe3193c.js"
      );

      // Delete if it's already there.
      if (fs.existsSync(expectedCache)) fs.unlinkSync(expectedCache);

      options.compilers = {
        solc: {
          version: "0.4.21"
        }
      };

      const cachedOptions = Config.default().merge(options);

      // Run compiler, expecting solc to be downloaded and cached.
      compile(version4PragmaSource, cachedOptions, err => {
        if (err) return done(err);

        assert(fs.existsSync(expectedCache), "Should have cached compiler");

        // Get cached solc access time
        initialAccessTime = fs.statSync(expectedCache).atime.getTime();

        // Wait a second and recompile, verifying that the cached solc
        // got accessed / ran ok.
        waitSecond()
          .then(() => {
            compile(version4PragmaSource, cachedOptions, (err, result) => {
              if (err) return done(err);

              finalAccessTime = fs.statSync(expectedCache).atime.getTime();

              assert(
                result["NewPragma"].contract_name === "NewPragma",
                "Should have compiled"
              );

              // atime is not getting updatd on read in CI.
              if (!process.env.TEST) {
                assert(
                  initialAccessTime < finalAccessTime,
                  "Should have used cached compiler"
                );
              }

              done();
            });
          })
          .catch(done);
      });
    });

    describe("native / docker [ @native ]", function() {
      it("compiles with native solc", function(done) {
        options.compilers = {
          solc: {
            version: "native"
          }
        };

        const nativeSolcOptions = Config.default().merge(options);

        compile(version5PragmaSource, nativeSolcOptions, (err, result) => {
          if (err) return done(err);

          assert(result["Version5Pragma"].compiler.version.includes("0.5."));
          assert(
            result["Version5Pragma"].contract_name === "Version5Pragma",
            "Should have compiled"
          );
          done();
        });
      });

      it("compiles with dockerized solc", function(done) {
        options.compilers = {
          solc: {
            version: "0.4.22",
            docker: true
          }
        };

        const dockerizedSolcOptions = Config.default().merge(options);

        const expectedVersion = "0.4.22+commit.4cb486ee.Linux.g++";

        compile(version4PragmaSource, dockerizedSolcOptions, (err, result) => {
          if (err) return done(err);

          assert(result["NewPragma"].compiler.version === expectedVersion);
          assert(
            result["NewPragma"].contract_name === "NewPragma",
            "Should have compiled"
          );
          done();
        });
      });

      it("resolves imports correctly when using built solc", function(done) {
        const paths = [];
        paths.push(path.join(__dirname, "./sources/v0.4.x/ComplexOrdered.sol"));
        paths.push(path.join(__dirname, "./sources/v0.4.x/InheritB.sol"));

        let options = {
          compilers: {
            solc: {
              version: "0.4.22",
              docker: true,
              settings: {
                optimizer: {
                  enabled: false,
                  runs: 200
                }
              }
            }
          },
          quiet: true,
          solc: "",
          contracts_build_directory: path.join(__dirname, "./build"),
          contracts_directory: path.join(__dirname, "./sources/v0.4.x"),
          working_directory: __dirname,
          paths: paths
        };

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
      });

      it("errors if running dockerized solc without specifying an image", function(done) {
        options.compilers = {
          solc: {
            version: undefined,
            docker: true,
            settings: {}
          }
        };

        compile(version4PragmaSource, options, err => {
          assert(err.message.includes("option must be"));
          done();
        });
      });

      it("errors if running dockerized solc when image does not exist locally", function(done) {
        const imageName = "fantasySolc.7777555";

        options.compilers = {
          solc: {
            version: imageName,
            docker: true,
            settings: {}
          }
        };

        compile(version4PragmaSource, options, err => {
          assert(err.message.includes(imageName));
          done();
        });
      });
    });
  });
});
