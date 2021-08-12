const { assert } = require("chai");
const CommandRunner = require("../commandRunner");
const Server = require("../server");
const sandbox = require("../sandbox");
const path = require("path");
const MemoryLogger = require("../MemoryLogger");

function verifyMigrationStatuses(statuses, deployingStatusString) {
  let cost = 0;

  it("includes all statuses", done => {
    assert.equal(statuses.length, 7);
    done();
  });

  it("includes preAllMigrations status", done => {
    const status = statuses[0];
    assert.equal(status.status, "preAllMigrations");
    assert.equal(status.data.dryRun, false);
    assert.equal(status.data.migrations.length, 1);
    done();
  });

  it("includes preMigrate status", done => {
    const status = statuses[1];
    assert.equal(status.status, "preMigrate");
    assert.equal(status.data.file, "1_initial_migration.js");
    assert.equal(status.data.number, 1);
    assert.equal(status.data.isFirst, true);
    assert.equal(status.data.network, "development");
    done();
  });

  it(`includes ${deployingStatusString} status`, done => {
    const status = statuses[2];
    assert.equal(status.status, deployingStatusString);
    assert.equal(status.data.contractName, "Migrations");

    if (deployingStatusString === "replacing") {
      assert.equal(typeof status.data.priorAddress, "string");
      assert.equal(status.data.priorAddress.slice(0, 2), "0x");
      assert.equal(status.data.priorAddress.length, 42);
    }

    done();
  });

  it("includes deployed status", done => {
    const status = statuses[3];
    assert.equal(status.status, "deployed");
    assert.equal(status.data.contract.contractName, "Migrations");
    assert.equal(typeof status.data.contract.address, "string");
    assert.equal(status.data.contract.address.slice(0, 2), "0x");
    assert.equal(status.data.contract.address.length, 42);
    assert.equal(status.data.deployed, true);
    assert.equal(status.data.gasUnit, "gwei");
    assert.equal(status.data.valueUnit, "ETH");
    cost = parseFloat(status.data.cost);
    assert(cost > 0);
    done();
  });

  it("includes postMigrate status", done => {
    const status = statuses[4];
    assert.equal(status.status, "postMigrate");
    assert.equal(status.data.number, 1);
    assert.equal(parseFloat(status.data.cost), cost);
    done();
  });

  it("includes lastMigrate status", done => {
    const status = statuses[5];
    assert.equal(status.status, "lastMigrate");
    assert.equal(parseFloat(status.data.finalCost), cost);
    done();
  });

  it("includes postAllMigrations status", done => {
    const status = statuses[6];
    assert.equal(status.status, "postAllMigrations");
    assert.equal(status.data.dryRun, false);
    assert.equal(status.data.error, null);
    done();
  });
}

describe("truffle migrate --describe-json", () => {
  let config, projectPath;
  let logger = new MemoryLogger();

  before("before all setup", done => {
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    sandbox
      .create(projectPath)
      .then(conf => {
        config = conf;
        config.network = "development";
        config.logger = logger;
      })
      .then(() => Server.start(done));
  });

  after(done => Server.stop(done));

  describe("when run on the most basic truffle project without --describe-json", () => {
    let contents;

    it("runs the migration without throwing", async () => {
      await CommandRunner.run("migrate --reset", config);
      contents = logger.contents();
    }).timeout(20000);

    it("does not include any `MIGRATION_STATUS` lines", done => {
      assert(!contents.includes("MIGRATION_STATUS"));
      done();
    });
  });

  describe("when run on the most basic truffle project with --describe-json", () => {
    describe("with existing migration", () => {
      let statuses = [];

      it("runs the migration without throwing", async () => {
        await CommandRunner.run("migrate --reset --describe-json", config);

        const contents = logger.contents();
        statuses.push(
          ...contents
            .split("\n")
            .filter(line => line.includes("MIGRATION_STATUS"))
            .map(line => JSON.parse(line.replace("MIGRATION_STATUS:", "")))
        );
      }).timeout(20000);

      verifyMigrationStatuses(statuses, "replacing");
    });

    describe("without existing migration (i.e. clean slate)", () => {
      let statuses = [];

      before("before all setup", done => {
        projectPath = path.join(__dirname, "../../sources/migrations/init");
        sandbox
          .create(projectPath)
          .then(conf => {
            config = conf;
            config.network = "development";
            config.logger = logger;
          })
          .then(done);
      });

      it("runs the migration without throwing", async () => {
        await CommandRunner.run("migrate --describe-json", config);

        const contents = logger.contents();
        statuses.push(
          ...contents
            .split("\n")
            .filter(line => line.includes("MIGRATION_STATUS"))
            .map(line => JSON.parse(line.replace("MIGRATION_STATUS:", "")))
        );
      }).timeout(20000);

      verifyMigrationStatuses(statuses, "deploying");
    });
  });
});
