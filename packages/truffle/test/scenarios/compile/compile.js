const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const log = console.log;

describe("Repeated compilation of contracts with inheritance [ @standalone ]", function() {
  let config,
    sourcePaths,
    artifactPaths,
    initialTimes,
    finalTimes,
    output,
    sources;
  const mapping = {};

  const project = path.join(__dirname, "../../sources/inheritance");
  const names = [
    "Root",
    "Branch",
    "LeafA",
    "LeafB",
    "LeafC",
    "SameFile1",
    "SameFile2",
    "LibraryA"
  ];
  const logger = new MemoryLogger();

  // ----------------------- Utils -----------------------------
  function processErr(err, output) {
    if (err) {
      log(output);
      throw new Error(err);
    }
  }

  function waitSecond() {
    return new Promise((resolve, _reject) => setTimeout(() => resolve(), 1250));
  }

  function getSource(key) {
    return fs.readFileSync(mapping[key].sourcePath);
  }

  function getArtifactStats() {
    const stats = {};
    names.forEach(key => {
      const mDate = fs.statSync(mapping[key].artifactPath).mtime.getTime();
      stats[key] = mDate;
    });
    return stats;
  }

  function touchSource(key) {
    const source = getSource(key);
    fs.writeFileSync(mapping[key].sourcePath, source);
  }

  // ----------------------- Setup -----------------------------

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  beforeEach("set up sandbox and do initial compile", async function() {
    this.timeout(30000);

    const conf = await sandbox.create(project);
    config = conf;
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    sources = names.map(name => name + ".sol");
    artifactPaths = names.map(name =>
      path.join(config.contracts_build_directory, name + ".json")
    );
    sourcePaths = sources.map(source =>
      path.join(config.contracts_directory, source)
    );

    names.forEach((name, i) => {
      mapping[name] = {};
      mapping[name].source = sources[i];
      mapping[name].artifactPath = artifactPaths[i];
      mapping[name].sourcePath = sourcePaths[i];
    });

    try {
      await CommandRunner.run("compile", config);
    } catch (error) {
      output = logger.contents();
      processErr(error, output);
    }

    initialTimes = getArtifactStats();

    // mTime resolution on 6.9.1 is 1 sec.
    await waitSecond();
  });

  // -------------Inheritance Graph -----------------------------
  //                                      |
  //      LibA         LeafA              |    SameFile1 - LeafC
  //     /           /       \            |
  // Root* - Branch -           - LeafC   |    SameFile2
  //                 \       /            |
  //                   LeafB              |
  // ------------------------------------------------------------

  it("Updates only Root when Root is touched", async function() {
    this.timeout(30000);

    touchSource("Root");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

    try {
      assert(initialTimes["Root"] < finalTimes["Root"], "Should update root");
      assert(
        initialTimes["Branch"] === finalTimes["Branch"],
        "Should not update Branch"
      );
      assert(
        initialTimes["LeafA"] === finalTimes["LeafA"],
        "Should not update LeafA"
      );
      assert(
        initialTimes["LeafB"] === finalTimes["LeafB"],
        "Should not update LeafB"
      );
      assert(
        initialTimes["LeafC"] === finalTimes["LeafC"],
        "Should not update LeafC"
      );
      assert(
        initialTimes["LibraryA"] === finalTimes["LibraryA"],
        "Should not update LibraryA"
      );
      assert(
        initialTimes["SameFile1"] === finalTimes["SameFile1"],
        "Should not update SameFile1"
      );
      assert(
        initialTimes["SameFile2"] === finalTimes["SameFile2"],
        "Should not update SameFile2"
      );
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
  //                 \       /            |
  //                   LeafB              |
  // ------------------------------------------------------------

  it("Updates Root and Library when Library is touched", async function() {
    this.timeout(30000);

    touchSource("LibraryA");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

    try {
      assert(initialTimes["Root"] < finalTimes["Root"], "Should update root");
      assert(
        initialTimes["Branch"] === finalTimes["Branch"],
        "Should not update Branch"
      );
      assert(
        initialTimes["LeafA"] === finalTimes["LeafA"],
        "Should not update LeafA"
      );
      assert(
        initialTimes["LeafB"] === finalTimes["LeafB"],
        "Should not update LeafB"
      );
      assert(
        initialTimes["LeafC"] === finalTimes["LeafC"],
        "Should not update LeafC"
      );
      assert(
        initialTimes["LibraryA"] < finalTimes["LibraryA"],
        "Should update LibraryA"
      );
      assert(
        initialTimes["SameFile1"] === finalTimes["SameFile1"],
        "Should not update SameFile1"
      );
      assert(
        initialTimes["SameFile2"] === finalTimes["SameFile2"],
        "Should not update SameFile2"
      );
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
  //                 \       /            |
  //                   LeafB              |
  // ------------------------------------------------------------

  it("Updates Branch and Root when Branch is touched", async function() {
    this.timeout(30000);

    touchSource("Branch");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

    try {
      assert(initialTimes["Root"] < finalTimes["Root"], "Should update root");
      assert(
        initialTimes["Branch"] < finalTimes["Branch"],
        "Should update Branch"
      );
      assert(
        initialTimes["LeafA"] === finalTimes["LeafA"],
        "Should not update LeafA"
      );
      assert(
        initialTimes["LeafB"] === finalTimes["LeafB"],
        "Should not update LeafB"
      );
      assert(
        initialTimes["LeafC"] === finalTimes["LeafC"],
        "Should not update LeafC"
      );
      assert(
        initialTimes["LibraryA"] === finalTimes["LibraryA"],
        "Should not update LibraryA"
      );
      assert(
        initialTimes["SameFile1"] === finalTimes["SameFile1"],
        "Should not update SameFile1"
      );
      assert(
        initialTimes["SameFile2"] === finalTimes["SameFile2"],
        "Should not update SameFile2"
      );
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
  //                  \       /            |
  //                    LeafB              |
  // ------------------------------------------------------------

  it("Updates LeafA, Branch and Root when LeafA is touched", async function() {
    this.timeout(30000);

    touchSource("LeafA");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

    try {
      assert(initialTimes["Root"] < finalTimes["Root"], "Should update root");
      assert(
        initialTimes["Branch"] < finalTimes["Branch"],
        "Should update Branch"
      );
      assert(
        initialTimes["LeafA"] < finalTimes["LeafA"],
        "Should update LeafA"
      );
      assert(
        initialTimes["LeafB"] === finalTimes["LeafB"],
        "Should not update LeafB"
      );
      assert(
        initialTimes["LeafC"] === finalTimes["LeafC"],
        "Should not update LeafC"
      );
      assert(
        initialTimes["LibraryA"] === finalTimes["LibraryA"],
        "Should not update LibraryA"
      );
      assert(
        initialTimes["SameFile1"] === finalTimes["SameFile1"],
        "Should not update SameFile1"
      );
      assert(
        initialTimes["SameFile2"] === finalTimes["SameFile2"],
        "Should not update SameFile2"
      );
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
  //                 \        /            |
  //                   LeafB*              |
  // ------------------------------------------------------------

  it("Updates everything except LibraryA when LeafC is touched", async function() {
    this.timeout(30000);

    touchSource("LeafC");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

    try {
      assert(initialTimes["Root"] < finalTimes["Root"], "Should update root");
      assert(
        initialTimes["Branch"] < finalTimes["Branch"],
        "Should update Branch"
      );
      assert(
        initialTimes["LeafA"] < finalTimes["LeafA"],
        "Should update LeafA"
      );
      assert(
        initialTimes["LeafB"] < finalTimes["LeafB"],
        "Should update LeafB"
      );
      assert(
        initialTimes["LeafC"] < finalTimes["LeafC"],
        "Should update LeafC"
      );
      assert(
        initialTimes["LibraryA"] === finalTimes["LibraryA"],
        "Should not update LibraryA"
      );
      assert(
        initialTimes["SameFile1"] < finalTimes["SameFile1"],
        "Should update SameFile1"
      );
      assert(
        initialTimes["SameFile2"] < finalTimes["SameFile2"],
        "Should update SameFile2"
      );
    } catch (err) {
      err.message += "\n\n" + output;
      throw new Error(err);
    }
  });
});
