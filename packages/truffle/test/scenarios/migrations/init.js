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

describe("solo migration", function() {
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, '../../sources/migrations/init');
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

  it("runs a migration with just Migrations.sol ", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate", config, err => {
      const output = logger.contents();
      processErr(err, output);

      const location = path.join(config.contracts_build_directory, "Migrations.json");
      const artifact = require(location);
      const network = artifact.networks[networkId];

      assert(output.includes(network.transactionHash));
      assert(output.includes(network.address));

      console.log(output)

      // Make sure it doesn't re-migrate the solo
      CommandRunner.run("migrate", config, err => {
        const output = logger.contents();
        processErr(err, output);
        assert(output.includes('Network up to date.'))
        done();
      })
    })
  });
});
