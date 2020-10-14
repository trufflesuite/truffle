const assert = require("assert");
const Config = require("@truffle/config");
const Resolver = require("@truffle/resolver");
const { compileWithPragmaAnalysis } = require("../compileWithPragmaAnalysis");
const path = require("path");
let paths = [];

const sourceDirectory = path.resolve(
  __dirname,
  "sources",
  "multipleSolcVersions"
);

const config = new Config().with({
  compilers: {
    solc: {
      settings: {},
      version: "analyzePragmas"
    }
  }
});

// she needs a resolver!
config.resolver = new Resolver(config);

describe("compileWithPragmaAnalysis", () => {
  describe("solidity files with no imports", () => {
    before(() => {
      paths = [
        path.join(sourceDirectory, "noImports", "SourceWith0.5.0.sol"),
        path.join(sourceDirectory, "noImports", "SourceWith0.6.0.sol"),
        path.join(sourceDirectory, "noImports", "SourceWith0.7.0.sol")
      ];
    });

    // note that it will find the newest version of Solidity that satisifes
    // each pragma expression and then do one compilation per version
    it("will make one compilation per compiler version", async () => {
      const { compilations } = await compileWithPragmaAnalysis({
        options: config,
        paths
      });
      assert.equal(compilations.length, 3);
    });

    it("will compile files with the same version together", async () => {
      const { compilations } = await compileWithPragmaAnalysis({
        options: config,
        paths: paths.concat(
          path.join(sourceDirectory, "noImports", "OtherSourceWith0.7.0.sol")
        )
      });
      assert.equal(compilations.length, 3);
    });
  });

  describe("solidity files with imports", () => {
    before(() => {
      paths = [path.join(sourceDirectory, "withImports", "C.sol")];
    });

    it("finds a version that satisfies all pragmas if it exists", async () => {
      const { compilations } = await compileWithPragmaAnalysis({
        options: config,
        paths: [path.join(sourceDirectory, "withImports", "C.sol")]
      });
      assert.equal(compilations.length, 1);
      assert(compilations[0].compiler.version.startsWith("0.6.12"));
    });

    it("throws an error if it cannot find one that satisifes", async () => {
      try {
        await compileWithPragmaAnalysis({
          options: config,
          paths: [
            path.join(sourceDirectory, "withImports", "NoCommonVersion.sol")
          ]
        });
        assert.fail("compiling that source should have failed");
      } catch (error) {
        const expectedSnippet = "Could not find a single version of the";
        if (!error.message.includes(expectedSnippet)) {
          throw error;
        }
      }
    });
  });
}).timeout(20000);
