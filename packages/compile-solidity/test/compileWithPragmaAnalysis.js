const assert = require("assert");
const Config = require("@truffle/config");
const {CompilerSupplier} = require("../dist/index");
const Resolver = require("@truffle/resolver");
const sinon = require("sinon");
const {compileWithPragmaAnalysis} = require("../dist/compileWithPragmaAnalysis");
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

const releases = {
  prereleases: [],
  releases: [
    "0.7.3",
    "0.7.2",
    "0.7.1",
    "0.7.0",
    "0.6.12",
    "0.6.11",
    "0.6.10",
    "0.6.9",
    "0.6.8",
    "0.6.7",
    "0.6.6",
    "0.6.5",
    "0.6.4",
    "0.6.3",
    "0.6.2",
    "0.6.1",
    "0.6.0",
    "0.5.17",
    "0.5.16",
    "0.5.15",
    "0.5.14",
    "0.5.13",
    "0.5.12",
    "0.5.11",
    "0.5.10",
    "0.5.9",
    "0.5.8",
    "0.5.7",
    "0.5.6",
    "0.5.5",
    "0.5.4",
    "0.5.4",
    "0.5.3",
    "0.5.2",
    "0.5.1",
    "0.5.0",
    "0.4.25",
    "0.4.24",
    "0.4.23",
    "0.4.22"
  ],
  latestRelease: "0.7.3"
};

// she needs a resolver!
config.resolver = new Resolver(config);

describe("compileWithPragmaAnalysis", function () {
  before(function () {
    sinon.stub(CompilerSupplier.prototype, "list").returns(releases);
  });
  after(function () {
    CompilerSupplier.prototype.list.restore();
  });

  describe("solidity files with no imports", function () {
    before(function () {
      paths = [
        path.join(sourceDirectory, "noImports", "SourceWith0.5.0.sol"),
        path.join(sourceDirectory, "noImports", "SourceWith0.6.0.sol"),
        path.join(sourceDirectory, "noImports", "SourceWith0.7.0.sol")
      ];
    });

    // note that it will find the newest version of Solidity that satisifes
    // each pragma expression and then do one compilation per version
    it("will make one compilation per compiler version", async function () {
      const { compilations } = await compileWithPragmaAnalysis({
        options: config,
        paths
      });
      assert.equal(compilations.length, 3);
    });

    it("will compile files with the same version together", async function () {
      const { compilations } = await compileWithPragmaAnalysis({
        options: config,
        paths: paths.concat(
          path.join(sourceDirectory, "noImports", "OtherSourceWith0.7.0.sol")
        )
      });
      assert.equal(compilations.length, 3);
    });
  });

  describe("solidity files with imports", function () {
    it("compiles both files with imports and without", async function () {
      const { compilations } = await compileWithPragmaAnalysis({
        options: config,
        paths: paths.concat([
          path.join(sourceDirectory, "withImports", "C.sol")
        ])
      });
      assert.equal(compilations.length, 3);
    });

    it("finds a version that satisfies all pragmas if it exists", async function () {
      const { compilations } = await compileWithPragmaAnalysis({
        options: config,
        paths: [path.join(sourceDirectory, "withImports", "C.sol")]
      });
      assert.equal(compilations.length, 1);
      assert(compilations[0].compiler.version.startsWith("0.6.12"));
    });

    it("throws an error if it cannot find one that satisfies", async function () {
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

  describe("when there is a semver expression error", function () {
    it("throws an error when it can't determine parser version", async function () {
      try {
        await compileWithPragmaAnalysis({
          options: config,
          paths: [path.join(sourceDirectory, "WithSemverError.sol")]
        });
        assert.fail("The function should have thrown.");
      } catch (error) {
        const expectedMessage = "Could not find a pragma expression";
        if (error.message.includes(expectedMessage)) {
          return "all good";
        }
        throw error;
      }
    });

    it("throws an error when import has bad semver", async function () {
      try {
        await compileWithPragmaAnalysis({
          options: config,
          paths: [
            path.join(sourceDirectory, "withImports", "ImportsBadSemver.sol")
          ]
        });
        assert.fail("The function should have thrown.");
      } catch (error) {
        const expectedMessage = "Invalid semver expression ($0.5.3)";
        if (error.message.includes(expectedMessage)) {
          return "all good";
        }
        throw error;
      }
    });
  });
});
