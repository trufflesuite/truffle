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

describe("migrate (success)", function() {
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, '../../sources/migrations/success');
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

  it("runs migrations (sync & async/await)", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate", config, err => {
      const output = logger.contents();
      processErr(err, output);

      assert(output.includes('2_migrations_sync.js'));
      assert(output.includes("Deploying 'UsesExample'"))
      assert(output.includes('3_migrations_async.js'));
      assert(output.includes("Re-using deployed 'Example'"))
      assert(output.includes("Replacing 'UsesExample'"))
      assert(output.includes("PayableExample"));
      assert(output.includes("1 ETH"));
      assert(output.includes("Saving migration"));
      assert(output.includes("Saving artifacts"));

      const location = path.join(config.contracts_build_directory, "UsesExample.json");
      const artifact = require(location);
      const network = artifact.networks[networkId];

      assert(output.includes(network.transactionHash));
      assert(output.includes(network.address));

      console.log(output)
      done();
    })
  });

  it('forces a migration with the -f option', function(done){
    this.timeout(70000);

    CommandRunner.run("migrate -f 3", config, err => {
      const output = logger.contents();
      processErr(err, output);
      assert(!output.includes('2_migrations_sync.js'));
      assert(output.includes('3_migrations_async.js'));
      assert(output.includes("Replacing 'IsLibrary'"))
      assert(output.includes("Replacing 'UsesLibrary'"));
      console.log(output)
      done();
    })
  });
});

