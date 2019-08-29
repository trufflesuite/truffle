const { assert } = require("chai");
const CommandRunner = require("../commandrunner");
const Server = require("../server");
const sandbox = require("../sandbox");
const path = require("path");
const MemoryLogger = require("../memorylogger");

describe("truffle migrate --describe", () => {
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

  describe("when run on the most basic truffle project without --describe", () => {
    let contents;

    it("runs the migration without throwing", done => {
      CommandRunner.run("migrate --reset", config, error => {
        assert(error === undefined, "error should be undefined here");
        contents = logger.contents();
        done();
      });
    }).timeout(20000);

    it("does not include any `MIGRATION_STATUS` lines", done => {
      assert(!contents.includes("MIGRATION_STATUS"));
      done();
    });
  });

  describe("when run on the most basic truffle project with --describe", () => {
    let statuses = [];
    let cost = 0;

    it("runs the migration without throwing", done => {
      CommandRunner.run("migrate --reset --describe", config, error => {
        assert(error === undefined, "error should be undefined here");

        const contents = logger.contents();
        statuses = contents
          .split("\n")
          .filter(line => line.includes("MIGRATION_STATUS"))
          .map(line => JSON.parse(line.replace("MIGRATION_STATUS:", "")));

        done();
      });
    }).timeout(20000);

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

    it("includes replacing (aka deploying on fresh migrations) status", done => {
      const status = statuses[2];
      assert.equal(status.status, "replacing");
      assert.equal(status.data.contractName, "Migrations");
      assert.equal(typeof status.data.priorAddress, "string");
      assert.equal(status.data.priorAddress.slice(0, 2), "0x");
      assert.equal(status.data.priorAddress.length, 42);
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
      cost = parseFloat(status.data.cost);
      assert.equal(cost, 0.00522786);
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

    after(done => {
      logger = new MemoryLogger();
      config.logger = logger;
      done();
    });
  });
});
