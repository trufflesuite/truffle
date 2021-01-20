const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Utils = require("./utils");

describe("Repeated compilation of contracts with imports [ @standalone ]", function () {
  let config, artifactPaths, initialTimes, finalTimes, output;
  const mapping = {};

  const project = path.join(__dirname, "../../sources/inheritance");
  const names = [
    "Root.sol",
    "Branch.sol",
    "LeafA.sol",
    "LeafB.sol",
    "LeafC.sol",
    "SameFile1.sol",
    "SameFile2.sol",
    "LibraryA.sol",
    "Abi.abi.json"
  ];
  const logger = new MemoryLogger();

  function hasBeenUpdated(fileName) {
    return initialTimes[fileName] < finalTimes[fileName];
  }

  // ----------------------- Setup -----------------------------

  before("set up the server", function (done) {
    Server.start(done);
  });

  after("stop server", function (done) {
    Server.stop(done);
  });

  beforeEach("set up sandbox and do initial compile", async function () {
    this.timeout(30000);

    const conf = await sandbox.create(project);
    config = conf;
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    // create artifact path array
    artifactPaths = names.map(name => {
      const basename = path.basename(path.basename(name, ".sol"), ".abi.json");
      return path.join(config.contracts_build_directory, `${basename}.json`);
    });

    // create mapping from name to source path
    names.forEach((name, i) => {
      mapping[name] = {};
      mapping[name].artifactPath = artifactPaths[i];
      mapping[name].sourcePath = path.join(config.contracts_directory, name);
    });

    try {
      await CommandRunner.run("compile", config);
    } catch (error) {
      output = logger.contents();
      Utils.processErr(error, output);
    }

    initialTimes = Utils.getArtifactStats();

    // mTime resolution on 6.9.1 is 1 sec.
    await Utils.waitSecond();
  });

  // -------------Inheritance Graph -----------------------------
  //                                      |
  //      LibA         LeafA              |    SameFile1 - LeafC
  //     /           /       \            |
  // Root* - Branch -           - LeafC   |    SameFile2
  //     \           \       /            |
  //      Abi          LeafB              |
  //                                      |
  // ------------------------------------------------------------

  it("updates only Root when Root is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("Root.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("Root.sol"), "Should update root");

      for (const file of Object.keys(mapping)) {
        if (file !== "Root.sol") {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph -----------------------------
  //                                      |
  //      LibA*        LeafA              |    SameFile1 - LeafC
  //     /           /       \            |
  // Root* - Branch -           - LeafC   |    SameFile2
  //     \           \       /            |
  //      Abi          LeafB              |
  //                                      |
  // ------------------------------------------------------------

  it("updates Root and Library when Library is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("LibraryA.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("Root.sol"), "Should update root");
      assert(hasBeenUpdated("LibraryA.sol"), "Should update LibraryA");

      for (const file of Object.keys(mapping)) {
        if (file !== "Root.sol" && file !== "LibraryA.sol") {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph -----------------------------
  //                                      |
  //      LibA         LeafA              |    SameFile1 - LeafC
  //     /           /       \            |
  // Root* - Branch* -           - LeafC  |    SameFile2
  //     \           \       /            |
  //      Abi          LeafB              |
  //                                      |
  // ------------------------------------------------------------

  it("updates Branch and Root when Branch is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("Branch.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("Root.sol"), "Should update root");
      assert(hasBeenUpdated("Branch.sol"), "Should update Branch");

      for (const file of Object.keys(mapping)) {
        if (file !== "Root.sol" && file !== "Branch.sol") {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph -----------------------------
  //                                       |
  //      LibA          LeafA*             |    SameFile1 - LeafC
  //     /            /       \            |
  // Root* - Branch* -           - LeafC   |    SameFile2
  //     \            \       /            |
  //      Abi           LeafB              |
  //                                       |
  // ------------------------------------------------------------

  it("updates LeafA, Branch and Root when LeafA is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("LeafA.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("LeafA.sol"), "Should update LeafA");
      assert(hasBeenUpdated("Branch.sol"), "Should update Branch");
      assert(hasBeenUpdated("Root.sol"), "Should update root");

      for (const file of Object.keys(mapping)) {
        if (
          file !== "Root.sol" &&
          file !== "Branch.sol" &&
          file !== "LeafA.sol"
        ) {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph -----------------------------
  //                                       |
  //      LibA         LeafA*              |  SameFile1* - LeafC*
  //     /           /        \            |
  // Root* - Branch* -           - LeafC*  |  SameFile2*
  //     \           \        /            |
  //      Abi          LeafB*              |
  //                                       |
  // ------------------------------------------------------------

  it("updates everything except LibraryA and Abi when LeafC is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("LeafC.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(!hasBeenUpdated("LibraryA.sol"), "Should not update LibraryA");
      assert(!hasBeenUpdated("Abi.abi.json"), "Should not update Abi");

      for (const file of Object.keys(mapping)) {
        if (file !== "LibraryA.sol" && file !== "Abi.abi.json") {
          assert(hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph -----------------------------
  //                                       |
  //      LibA         LeafA*              |  SameFile1* - LeafC*
  //     /           /        \            |
  // Root* - Branch* -           - LeafC*  |  SameFile2*
  //     \           \        /            |
  //      Abi          LeafB*              |
  //                                       |
  // ------------------------------------------------------------

  it("updates Root and Abi when Abi is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("Abi.abi.json");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("Root.sol"), "Should update root");
      assert(hasBeenUpdated("Abi.abi.json"), "Should update Abi");
      for (const file of Object.keys(mapping)) {
        if (file !== "Root.sol" && file !== "Abi.abi.json") {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });
});
