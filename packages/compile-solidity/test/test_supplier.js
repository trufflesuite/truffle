const debug = require("debug")("compile:test:test_supplier");
const fse = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Resolver = require("@truffle/resolver");
const { Compile } = require("@truffle/compile-solidity");
const Config = require("@truffle/config");
const { findOne } = require("./helpers");

function waitSecond() {
  return new Promise(resolve => setTimeout(() => resolve(), 1250));
}

describe("CompilerSupplier", function () {
  describe("integration", function () {
    this.timeout(40000);
    let oldPragmaPinSource; //  0.4.15
    let oldPragmaFloatSource; // ^0.4.15
    let version4PragmaSource; // ^0.4.21
    let version5PragmaSource; // ^0.5.0
    let version6PragmaSource; // ^0.6.0
    let versionLatestPragmaSource; // Currently: ^0.8.0
    let compileConfig;

    const options = {
      contracts_directory: "",
      solc: "",
      quiet: true
    };

    before("get code", async function () {
      const oldPragmaPin = await fse.readFile(
        path.join(__dirname, "./sources/v0.4.15/OldPragmaPin.sol"),
        "utf-8"
      );
      const oldPragmaFloat = await fse.readFile(
        path.join(__dirname, "./sources/v0.4.x/OldPragmaFloat.sol"),
        "utf-8"
      );
      const version4Pragma = await fse.readFile(
        path.join(__dirname, "./sources/v0.4.x/NewPragma.sol"),
        "utf-8"
      );
      const version5Pragma = await fse.readFile(
        path.join(__dirname, "./sources/v0.5.x/Version5Pragma.sol"),
        "utf-8"
      );
      const version6Pragma = await fse.readFile(
        path.join(__dirname, "./sources/v0.6.x/Version6Pragma.sol"),
        "utf-8"
      );

      const versionLatestPragma = await fse.readFile(
        path.join(__dirname, "./sources/v0.8.x/Version8Pragma.sol"), //update when necessary
        "utf-8"
      );

      oldPragmaPinSource = { "OldPragmaPin.sol": oldPragmaPin };
      oldPragmaFloatSource = { "OldPragmaFloat.sol": oldPragmaFloat };
      version4PragmaSource = { "NewPragma.sol": version4Pragma };
      version5PragmaSource = { "Version5Pragma.sol": version5Pragma };
      version6PragmaSource = { "Version6Pragma.sol": version6Pragma };
      versionLatestPragmaSource = { "Version8Pragma.sol": versionLatestPragma }; //update when necessary
    });

    it("compiles w/ default solc if no compiler specified (float)", async function () {
      const defaultOptions = Config.default().merge(options);

      const { compilations } = await Compile.sources({
        sources: version5PragmaSource,
        options: defaultOptions
      });
      const Version5Pragma = findOne(
        "Version5Pragma",
        compilations[0].contracts
      );

      assert(Version5Pragma.contractName === "Version5Pragma");
    });

    it("compiles w/ remote solc when options specify release (pinned)", async function () {
      options.compilers = {
        solc: {
          version: "0.4.15",
          settings: {}
        }
      };
      const config = new Config().with(options);

      const { compilations } = await Compile.sources({
        sources: oldPragmaPinSource,
        options: config
      });
      const OldPragmaPin = findOne("OldPragmaPin", compilations[0].contracts);

      assert(OldPragmaPin.contractName === "OldPragmaPin");
    });

    it("compiles w/ remote solc when options specify prerelease (float)", async function () {
      this.timeout(20000);
      // An 0.4.16 prerelease for 0.4.15
      options.compilers = {
        solc: {
          version: "0.4.16-nightly.2017.8.9+commit.81887bc7",
          settings: {}
        }
      };

      const config = Config.default().merge(options);
      const { compilations } = await Compile.sources({
        sources: oldPragmaFloatSource,
        options: config
      });
      const OldPragmaFloat = findOne(
        "OldPragmaFloat",
        compilations[0].contracts
      );

      assert(OldPragmaFloat.contractName === "OldPragmaFloat");
    });

    it("compiles w/ local path solc when options specify path", async function () {
      const pathToSolc = path.join(__dirname, "../node_modules/solc/index.js");

      options.compilers = {
        solc: {
          version: pathToSolc
        }
      };

      const localPathOptions = Config.default().merge(options);

      const { compilations } = await Compile.sources({
        sources: version6PragmaSource,
        options: localPathOptions
      });
      const Version6Pragma = findOne(
        "Version6Pragma",
        compilations[0].contracts
      );
      assert(Version6Pragma.contractName === "Version6Pragma");
    });

    it("caches releases and uses them if available", async function () {
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
      if (await fse.exists(expectedCache)) await fse.unlink(expectedCache);

      options.compilers = {
        solc: { version: "0.4.21" }
      };

      const cachedOptions = Config.default().merge(options);

      // Run compiler, expecting solc to be downloaded and cached.
      await Compile.sources({
        sources: version4PragmaSource,
        options: cachedOptions
      });

      assert(await fse.exists(expectedCache), "Should have cached compiler");

      // Get cached solc access time
      initialAccessTime = (await fse.stat(expectedCache)).atime.getTime();

      // Wait a second and recompile, verifying that the cached solc
      // got accessed / ran ok.
      await waitSecond();

      const { compilations } = await Compile.sources({
        sources: version4PragmaSource,
        options: cachedOptions
      });

      finalAccessTime = (await fse.stat(expectedCache)).atime.getTime();
      const NewPragma = findOne("NewPragma", compilations[0].contracts);

      assert(NewPragma.contractName === "NewPragma", "Should have compiled");

      // atime is not getting updatd on read in CI.
      if (!process.env.TEST) {
        assert(
          initialAccessTime < finalAccessTime,
          "Should have used cached compiler"
        );
      }
    });

    describe("native / docker [ @native ]", function () {
      it("compiles with native solc", async function () {
        options.compilers = {
          solc: {
            version: "native"
          }
        };

        const nativeSolcOptions = Config.default().merge(options);

        const { compilations } = await Compile.sources({
          sources: versionLatestPragmaSource,
          options: nativeSolcOptions
        });
        const VersionLatestPragma = findOne(
          "Version8Pragma",
          compilations[0].contracts
        ); //update when necessary
        assert(VersionLatestPragma.compiler.version.includes("0.8.")); //update when necessary
        assert(
          VersionLatestPragma.contractName === "Version8Pragma", //update when necessary
          "Should have compiled"
        );
      });

      it("compiles with dockerized solc", async function () {
        options.compilers = {
          solc: {
            version: "0.4.22",
            docker: true
          }
        };

        const dockerizedSolcOptions = Config.default().merge(options);

        const expectedVersion = "0.4.22+commit.4cb486ee.Linux.g++";

        const { compilations } = await Compile.sources({
          sources: version4PragmaSource,
          options: dockerizedSolcOptions
        });
        const NewPragma = findOne("NewPragma", compilations[0].contracts);

        assert(NewPragma.compiler.version === expectedVersion);
        assert(NewPragma.contractName === "NewPragma", "Should have compiled");
      });

      it("resolves imports correctly when using built solc", async function () {
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
        options = Config.default().merge(options);

        const { compilations } = await Compile.sourcesWithDependencies({
          paths,
          options
        });
        const ComplexOrdered = findOne(
          "ComplexOrdered",
          compilations[0].contracts
        );

        // This contract imports / inherits
        assert(
          ComplexOrdered.contractName === "ComplexOrdered",
          "Should have compiled"
        );
      });

      it("errors if running dockerized solc without specifying an image", async function () {
        options.compilers = {
          solc: {
            version: undefined,
            docker: true,
            settings: {}
          }
        };
        compileConfig = Config.default().merge(options);

        let error;
        try {
          await Compile.sources({
            sources: version4PragmaSource,
            options: compileConfig
          });
        } catch (err) {
          error = err;
        }

        assert(error);
        assert(error.message.includes("option must be"));
      });

      it("errors if running dockerized solc when image does not exist locally", async function () {
        const imageName = "fantasySolc.7777555";

        options.compilers = {
          solc: {
            version: imageName,
            docker: true,
            settings: {}
          }
        };
        compileConfig = Config.default().merge(options);

        let error;
        try {
          await Compile.sources({
            sources: version4PragmaSource,
            options: compileConfig
          });
        } catch (err) {
          error = err;
        }

        assert(error);
        assert(error.message.includes(imageName));
      });
    });
  });
});
