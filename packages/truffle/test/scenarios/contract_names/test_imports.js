var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("@truffle/contract");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");
const sandbox = require("../sandbox");

describe("Contract names", function() {
  let config;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/contract_names");

  before(done => Server.start(done));
  after(done => Server.stop(done));

  before(async function() {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };
  });

  it("will compile if file names do not match contract names", async function() {
    this.timeout(40000);

    await CommandRunner.run("compile", config);

    // The contract's name is Contract, but the file name is contract.
    // Not only should we not receive an error, but we should receive contract
    // artifacts relative to the contract name and not the file name.
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "Contract.json")
      )
    );
  });

  it("will migrate when artifacts.require() doesn't have an extension and names do not match", async function() {
    this.timeout(50000);

    await CommandRunner.run("migrate", config);

    const contractPath = path.join(
      config.contracts_build_directory,
      "Contract.json"
    );
    const Contract = contract(require(contractPath));
    Contract.setProvider(config.provider);

    const instance = await Contract.deployed();
    assert.notEqual(
      instance.address,
      null,
      instance.contract_name + " didn't have an address!"
    );

    // Now let's interact with our deployed contract JUST to ensure it actually did do
    // the right thing.
    const value = await instance.specialValue.call();
    assert.equal(
      parseInt(value),
      1337,
      "Somehow the wrong contract was deployed, because we don't have the correct value"
    );
  });

  it("will compile and migrate with relative imports (using filename)", async function() {
    this.timeout(50000);

    const contractPath = path.join(
      config.contracts_build_directory,
      "RelativeImport.json"
    );

    await CommandRunner.run("compile", config);

    assert(fs.existsSync(contractPath));

    await CommandRunner.run("migrate", config);

    const RelativeImport = contract(require(contractPath));
    RelativeImport.setProvider(config.provider);

    const instance = await RelativeImport.deployed();
    assert.notEqual(
      instance.address,
      null,
      instance.contract_name + " didn't have an address!"
    );

    // Now let's interact with our deployed contract JUST to ensure it actually did do
    // the right thing.
    const value = await instance.specialValue.call();
    assert.equal(
      parseInt(value),
      1337,
      "Somehow the wrong contract was deployed, because we don't have the correct value"
    );
  });
});
