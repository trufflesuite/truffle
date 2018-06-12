const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require('web3');

const log = console.log;

const util = require('util');

function processErr(err, output){
  if (err){
    log(output);
    throw new Error(err);
  }
}

describe("migration errors", function() {
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, '../../sources/migrations/error');
  const logger = new MemoryLogger();

  before(done => Server.start(done));
  after(done => Server.stop(done));

  before(async function() {
    this.timeout(10000);
    config = await sandbox.create(project)
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    }

    const provider = new Web3.providers.HttpProvider('http://localhost:8545')
    web3 = new Web3(provider);
    networkId = await web3.eth.net.getId();
  });

  it("should error and stop", function(done) {
    this.timeout(20000);

    CommandRunner.run("migrate", config, err => {
      const output = logger.contents();
      console.log(output)
      assert(err);

      assert(output.includes('2_migrations_revert.js'));
      assert(output.includes("Deploying 'Example'"))
      assert(output.includes("Deploying 'ExampleRevert'"));
      assert(output.includes("Error"));
      assert(!output.includes("Deploying 'UsesExample'"))
      assert(!output.includes('3_migrations_ok.js'));

      const location = path.join(config.contracts_build_directory, "UsesExample.json");
      const artifact = require(location);
      const network = artifact.networks[networkId];
      assert(network === undefined);
      done();
    })
  });

  it("should run from the last successfully completely migration", function(done) {
    this.timeout(20000);

    CommandRunner.run("migrate", config, err => {
      const output = logger.contents();
      console.log(output)
      assert(err);

      assert(!output.includes('1_initial_migration.js'))
      assert(output.includes('2_migrations_revert.js'));
      done();
    })
  });

  it("should run out of gas correctly", function(done){
    this.timeout(20000);

    CommandRunner.run("migrate -f 4", config, err => {
      const output = logger.contents();
      assert(err);
      console.log(output)
      assert(output.includes('4_migrations_oog.js'));
      assert(output.includes("Deploying 'Loops'"));
      assert(output.includes('Error'));
      assert(output.includes('out of gas'));
      done();
    });
  })
});