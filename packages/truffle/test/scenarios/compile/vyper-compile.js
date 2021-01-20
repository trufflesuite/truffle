const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Utils = require("./utils");

//NOTE: this file is copypasted with modifications from compile.js
describe("Repeated compilation of Vyper contracts with imports [ @standalone ]", function () {
  let config, artifactPaths, initialTimes, finalTimes, output;
  const mapping = {};

  const project = path.join(__dirname, "../../sources/vyper-imports");
  const names = ["Root.vy", "Branch.vy", "LeafA.vy", "LeafB.vy", "LeafC.vy"];
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
      const basename = path.basename(path.basename(name, ".vy"));
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

  // -------------Inheritance Graph -------
  //                                      |
  //      ERC20        LeafA              |
  //     /           /       \            |
  // Root* - Branch -           - LeafC   |
  //     \           \       /            |
  //      Abi          LeafB              |
  //                                      |
  // --------------------------------------

  it("updates only Root when Root is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("Root.vy");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("Root.vy"), "Should update root");

      for (const file of Object.keys(mapping)) {
        if (file !== "Root.vy") {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph -------
  //                                      |
  //      ERC20        LeafA              |
  //     /           /       \            |
  // Root* - Branch* -           - LeafC  |
  //     \           \       /            |
  //      Abi          LeafB              |
  //                                      |
  // --------------------------------------

  it("updates Branch and Root when Branch is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("Branch.vy");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("Root.vy"), "Should update root");
      assert(hasBeenUpdated("Branch.vy"), "Should update Branch");

      for (const file of Object.keys(mapping)) {
        if (file !== "Root.vy" && file !== "Branch.vy") {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph --------
  //                                       |
  //      ERC20        LeafA*              |
  //     /           /       \             |
  // Root* - Branch* -           - LeafC   |
  //     \            \       /            |
  //      Abi           LeafB              |
  //                                       |
  // ---------------------------------------

  it("updates LeafA, Branch and Root when LeafA is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("LeafA.vy");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      assert(hasBeenUpdated("LeafA.vy"), "Should update LeafA");
      assert(hasBeenUpdated("Branch.vy"), "Should update Branch");
      assert(hasBeenUpdated("Root.vy"), "Should update root");

      for (const file of Object.keys(mapping)) {
        if (file !== "Root.vy" && file !== "Branch.vy" && file !== "LeafA.vy") {
          assert(!hasBeenUpdated(file), `Should not update ${file}`);
        }
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });

  // -------------Inheritance Graph --------
  //                                       |
  //      ERC20        LeafA*              |
  //     /           /       \             |
  // Root* - Branch* -           - LeafC*  |
  //     \           \        /            |
  //      Abi          LeafB*              |
  //                                       |
  // ---------------------------------------

  it("updates everything when LeafC is touched", async function () {
    this.timeout(30000);

    Utils.touchSource("LeafC.vy");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = Utils.getArtifactStats();

    try {
      for (const file of Object.keys(mapping)) {
        assert(hasBeenUpdated(file), `Should not update ${file}`);
      }
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });
});
