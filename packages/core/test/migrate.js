const assert = require("chai").assert;
const { default: Box } = require("@truffle/box");
const Migrate = require("@truffle/migrate");
const WorkflowCompile = require("@truffle/workflow-compile").default;
const Networks = require("../lib/networks");
const path = require("path");
const fs = require("fs-extra");
const Ganache = require("ganache");
const { Resolver } = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");
const Web3 = require("web3");
let provider;

const providers = [];

async function createProviderAndSetNetworkConfig(network, config) {
  provider = Ganache.provider({
    seed: network,
    miner: {
      instamine: "strict"
    },
    logging: {
      quiet: true
    }
  });
  // we need to save refs to all providers created so that we can disconnect
  // them - if they aren't disconnected then the tests hang a bit
  providers.push(provider);
  const web3 = new Web3(provider);
  const accounts = await web3.eth.getAccounts();
  const networkId = await web3.eth.net.getId();
  config.networks[network] = {
    provider,
    network_id: networkId,
    from: accounts[0]
  };
}

describe("migrate", function () {
  let config;

  before("create test project and set up network configs", async function () {
    config = await Box.sandbox("default");
    config.networks = {};
    await createProviderAndSetNetworkConfig("primary", config);
    await createProviderAndSetNetworkConfig("secondary", config);
  });
  after(async function () {
    for (const pro of providers) {
      await pro.disconnect();
    }
  });

  it("profiles a new project as not having any contracts deployed", async function () {
    const networks = await Networks.deployed(config);
    assert.equal(
      Object.keys(networks).length,
      2,
      "Should have results for two networks from profiler"
    );
    assert.equal(
      Object.keys(networks["primary"]),
      0,
      "Primary network should not have been deployed to"
    );
    assert.equal(
      Object.keys(networks["secondary"]),
      0,
      "Secondary network should not have been deployed to"
    );
  });

  it("links libraries in initial project, and runs all migrations", async function () {
    this.timeout(10000);

    config.network = "primary";

    await WorkflowCompile.compileAndSave(
      config.with({ all: false, quiet: true })
    );

    await Migrate.run(config.with({ quiet: true }));

    const networks = await Networks.deployed(config);

    assert.equal(
      Object.keys(networks).length,
      2,
      "Should have results for two networks from profiler"
    );
    assert.equal(
      Object.keys(networks["primary"]).length,
      3,
      "Primary network should have three contracts deployed"
    );
    assert.isNotNull(
      networks["primary"]["MetaCoin"],
      "MetaCoin contract should have an address"
    );
    assert.isNotNull(
      networks["primary"]["ConvertLib"],
      "ConvertLib library should have an address"
    );
    assert.isNotNull(
      networks["primary"]["Migrations"],
      "Migrations contract should have an address"
    );
    assert.equal(
      Object.keys(networks["secondary"]),
      0,
      "Secondary network should not have been deployed to"
    );
  });

  it("should migrate secondary network without altering primary network", async function () {
    this.timeout(10000);

    config.network = "secondary";

    const currentAddresses = {};

    let networks = await Networks.deployed(config);

    ["MetaCoin", "ConvertLib", "Migrations"].forEach(contractName => {
      currentAddresses[contractName] = networks["primary"][contractName];
    });

    // we need to recreate the resolver here or the new contract addresses will
    // not be created in the artifact as it will retrieve the artifacts from
    // the cache - normall a new resolver is created for every run
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);

    await Migrate.run(config.with({ quiet: true }));

    networks = await Networks.deployed(config);
    assert.equal(
      Object.keys(networks).length,
      2,
      "Should have results for two networks from profiler"
    );
    assert.equal(
      Object.keys(networks["primary"]).length,
      3,
      "Primary network should have three contracts deployed"
    );
    assert.equal(
      networks["primary"]["MetaCoin"],
      currentAddresses["MetaCoin"],
      "MetaCoin contract updated on primary network"
    );
    assert.equal(
      networks["primary"]["ConvertLib"],
      currentAddresses["ConvertLib"],
      "ConvertLib library updated on primary network"
    );
    assert.equal(
      networks["primary"]["Migrations"],
      currentAddresses["Migrations"],
      "Migrations contract updated on primary network"
    );
    assert.equal(
      Object.keys(networks["secondary"]).length,
      3,
      "Secondary network should have three contracts deployed"
    );
    assert.isNotNull(
      networks["secondary"]["MetaCoin"],
      "MetaCoin contract should have an address on secondary network"
    );
    assert.isNotNull(
      networks["secondary"]["ConvertLib"],
      "ConvertLib library should have an address on secondary network"
    );
    assert.isNotNull(
      networks["secondary"]["Migrations"],
      "Migrations contract should have an address on secondary network"
    );

    Object.keys(networks["primary"]).forEach(function (contract_name) {
      assert.notEqual(
        networks["secondary"][contract_name],
        networks["primary"][contract_name],
        "Contract " + contract_name + " has the same address on both networks"
      );
    });
  });

  it("should ignore files that don't start with a number", function () {
    fs.writeFileSync(
      path.join(config.migrations_directory, "~2_deploy_contracts.js"),
      "module.exports = function() {};",
      "utf8"
    );

    const migrations = Migrate.assemble(config);
    assert.equal(
      migrations.length,
      2,
      "~2_deploy_contracts.js should have been ignored!"
    );
  });

  it("should ignore non-js extensions", function () {
    fs.writeFileSync(
      path.join(config.migrations_directory, "2_deploy_contracts.js~"),
      "module.exports = function() {};",
      "utf8"
    );

    const migrations = Migrate.assemble(config);
    assert.equal(
      migrations.length,
      2,
      "2_deploy_contracts.js~ should have been ignored!"
    );
  });
}).timeout(10000);
