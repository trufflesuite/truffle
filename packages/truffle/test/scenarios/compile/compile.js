const CommandRunner = require("../commandRunner");
const MemoryLogger = require("../MemoryLogger");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const fse = require("fs-extra");
const { connect } = require("@truffle/db");
const gql = require("graphql-tag");
const pascalCase = require("pascal-case");
const Config = require("@truffle/config");
let config, artifactPaths, initialTimes, finalTimes, output;

describe("repeated compilation of contracts with inheritance [ @standalone ]", function () {
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

  // ----------------------- Utils -----------------------------
  function processErr(err, output) {
    if (err) {
      console.log(output);
      throw new Error(err);
    }
  }

  function waitSecond() {
    return new Promise((resolve, _reject) => setTimeout(() => resolve(), 1250));
  }

  function getSource(key) {
    return fse.readFileSync(mapping[key].sourcePath);
  }

  function getArtifactStats() {
    const stats = {};
    names.forEach(key => {
      const mDate = fse.statSync(mapping[key].artifactPath).mtime.getTime();
      stats[key] = mDate;
    });
    return stats;
  }

  function touchSource(key) {
    const source = getSource(key);
    fse.writeFileSync(mapping[key].sourcePath, source);
  }

  function hasBeenUpdated(fileName) {
    return initialTimes[fileName] < finalTimes[fileName];
  }

  // ----------------------- Setup -----------------------------

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  beforeEach("set up sandbox and do initial compile", async function () {
    this.timeout(30000);
    config = await sandbox.create(project);
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
  //     \           \       /            |
  //      Abi          LeafB              |
  //                                      |
  // ------------------------------------------------------------

  it("updates only Root when Root is touched", async function () {
    this.timeout(30000);

    touchSource("Root.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

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

    touchSource("LibraryA.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

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

    touchSource("Branch.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

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

    touchSource("LeafA.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

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

    touchSource("LeafC.sol");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

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

    touchSource("Abi.abi.json");

    await CommandRunner.run("compile", config);
    output = logger.contents();

    finalTimes = getArtifactStats();

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

describe("compilation with db enabled", async () => {
  let config, project;
  const logger = new MemoryLogger();

  function checkForDb() {
    const truffleDataDirectory = Config.getTruffleDataDirectory();
    const dbPath = path.join(truffleDataDirectory, ".db");

    const dbExists = fse.pathExistsSync(dbPath);
    return dbExists;
  }

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  beforeEach("set up sandbox and do initial compile", async function () {
    this.timeout(30000);

    project = path.join(__dirname, "../../sources/db_enabled");
    config = await sandbox.create(project);

    try {
      await CommandRunner.run("compile", config);
    } catch (error) {
      output = logger.contents();
      console.log(output);
      throw new Error(error);
    }
  });

  it("creates a populated .db directory when db is enabled", async function () {
    this.timeout(12000);
    const dbExists = checkForDb();
    assert(dbExists === true);
  });

  it("adds contracts to the db", async function () {
    this.timeout(12000);

    const GetAllContracts = gql`
      query getAllContracts {
        contracts {
          name
        }
      }
    `;

    // connect to DB
    const db = connect();
    const results = await db.execute(GetAllContracts, {});

    // number of contracts matches number of contracts in the project directory
    // (plus one library in this one)
    const names = ["Contract", "InnerLibrary", "Migrations", "RelativeImport"];
    for (const name of names) {
      assert(results.data.contracts.some(contract => contract.name === name));
    }

    // contract names in project exist in new .db contracts file
    const resultsNames = results.data.contracts.map(a => a.name);

    const contractNames = fse.readdirSync(path.join(project, "contracts"));
    contractNames.map(name => {
      const processedName = pascalCase(name.split(".")[0]);
      assert(resultsNames.includes(processedName));
    });
  });
});
