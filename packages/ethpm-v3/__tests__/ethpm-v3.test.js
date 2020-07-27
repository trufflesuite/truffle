"use strict";

var assert = require("chai").assert;
const expect = require("chai").expect;
var Box = require("@truffle/box");
var fs = require("fs-extra");
var glob = require("glob");
var path = require("path");
var Contracts = require("@truffle/workflow-compile");
var PackageV3 = require("../lib/package.js");
const Ganache = require("ganache-core");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");
const Web3 = require("web3");
const registryManifest = require("ethpm/registries/web3/simple/registry.json");
const Migrate = require("@truffle/migrate");

const INSTALL_PROVIDER_URI =
  "https://mainnet.infura.io/v3/7707850c2fb7465ebe6f150d67182e22";
const INFURA_KEY = "7707850c2fb7465ebe6f150d67182e22";

describe("EthPM packages", function () {
  var config;
  var registry;
  var provider;
  let web3;
  let owner;
  let accounts;
  this.timeout(30000);

  beforeEach("Create a Ganache provider and get a blockchain uri", async () => {
    provider = Ganache.provider();
    web3 = new Web3(provider);
    accounts = await web3.eth.getAccounts();
    owner = accounts[0];
  });

  // Super slow doing these in a beforeEach, but it ensures nothing conflicts.
  beforeEach("Create a sandbox", async () => {
    this.timeout(20000);
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.network = "development";
    config.networks = {
      development: {
        network_id: provider.options.network_id,
        provider: provider,
        from: owner,
      },
    };
    config.ethpm = {
      install_provider_uri: INSTALL_PROVIDER_URI,
      ipfsHost: "ipfs.infura.io",
      ipfsPort: "5001",
      ipfsProtocol: "https",
    };
  });

  beforeEach("Create a fake EthPM host and memory registry", async () => {
    this.timeout(30000); // I've had varying runtimes with this block, likely due to networking.
    const registryFactory = new web3.eth.Contract(
      registryManifest.contract_types.PackageRegistry.abi
    );
    const deployment_bytecode =
      registryManifest.contract_types.PackageRegistry.deployment_bytecode
        .bytecode;

    // deploy registry
    registry = await registryFactory
      .deploy({ data: deployment_bytecode })
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    config.registry = registry._address;
    config.ethpm.registryAddress = registry._address;

    // publish ens@1.0.0
    await registry.methods
      .release(
        "ens",
        "1.0.0",
        "ipfs://QmeooZzPrT2hDWSkhGoyLeSecsSbU26E6RiYfkXfPoug9U"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    // publish ethregistrar@1.0.1
    await registry.methods
      .release(
        "ethregistrar",
        "1.0.1",
        "ipfs://Qmf5uJd3yChPwxYxHqR1KN2CdXt2pfsAfPzQe8gkNutwT3"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });
  });

  after("Cleanup tmp files", function (done) {
    // something's not getting cleaned up somewhere
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  it("lists available packages", async () => {
    await PackageV3.packages(config);
  });
});

describe("EthPM install", function () {
  var config;
  var registry;
  var provider;
  let web3;
  let owner;
  let accounts;
  this.timeout(30000);

  beforeEach("Create a Ganache provider and get a blockchain uri", async () => {
    provider = Ganache.provider();
    web3 = new Web3(provider);
    accounts = await web3.eth.getAccounts();
    owner = accounts[0];
  });

  // Super slow doing these in a beforeEach, but it ensures nothing conflicts.
  beforeEach("Create a sandbox", async () => {
    this.timeout(20000);
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.network = "development";
    config.networks = {
      development: {
        network_id: provider.options.network_id,
        provider: provider,
        from: owner,
      },
    };
    config.ethpm = {
      install_provider_uri: INSTALL_PROVIDER_URI,
      ipfsHost: "ipfs.infura.io",
      ipfsPort: "5001",
      ipfsProtocol: "https",
    };
  });

  beforeEach("Create a fake EthPM host and memory registry", async () => {
    this.timeout(30000); // I've had varying runtimes with this block, likely due to networking.
    const registryFactory = new web3.eth.Contract(
      registryManifest.contract_types.PackageRegistry.abi
    );
    const deployment_bytecode =
      registryManifest.contract_types.PackageRegistry.deployment_bytecode
        .bytecode;

    // deploy registry
    registry = await registryFactory
      .deploy({ data: deployment_bytecode })
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    config.registry = registry._address;

    // publish ens@1.0.0
    await registry.methods
      .release(
        "ens",
        "1.0.0",
        "ipfs://QmeooZzPrT2hDWSkhGoyLeSecsSbU26E6RiYfkXfPoug9U"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    // publish ethregistrar@1.0.1
    await registry.methods
      .release(
        "ethregistrar",
        "1.0.1",
        "ipfs://Qmf5uJd3yChPwxYxHqR1KN2CdXt2pfsAfPzQe8gkNutwT3"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });
  });

  after("Cleanup tmp files", function (done) {
    // something's not getting cleaned up somewhere
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  it("requires a valid package name and version to install", async () => {
    config.ethpm_uri = `erc1319://${registry._address}:1`;
    try {
      await PackageV3.install(config);
    } catch (error) {
      expect(error.message).to.include("Invalid ethPM uri.");
    }
  });

  it("invalidates ethpm uris for packages not published on itself", async () => {
    config.ethpm_uri = `erc1319://${registry._address}:1/invalid@1.0.0`;
    try {
      await PackageV3.install(config);
    } catch (error) {
      expect(error.message).to.include(
        "Package: invalid, not found on registry"
      );
    }
  });

  it("successfully installs single dependency from EthPM", async () => {
    config.ethpm_uri = `erc1319://${registry._address}:1/ens@1.0.0`;
    await PackageV3.install(config);
    const expected_ethpm_directory = path.resolve(
      path.join(config.working_directory, "_ethpm_packages")
    );
    const expected_install_directory = path.resolve(
      path.join(expected_ethpm_directory, "ens")
    );
    assert(fs.existsSync(path.join(expected_ethpm_directory, "ethpm.lock")));
    assert(
      fs.existsSync(path.join(expected_install_directory, "_src", "ENS.sol"))
    );
    assert(
      fs.existsSync(path.join(expected_install_directory, "manifest.json"))
    );
  });

  it("successfully installs and provisions a package with dependencies from EthPMv2", async () => {
    config.ethpm_uri = `erc1319://${registry._address}:1/ens@1.0.0`;
    await PackageV3.install(config);

    // Write a contract that uses transferable, so it will be compiled.
    var contractSource =
      "pragma solidity ^0.5.12; import 'ens/ENS.sol'; contract MyContract {}";
    fs.writeFileSync(
      path.join(config.contracts_directory, "MyContract.sol"),
      contractSource,
      "utf8"
    );

    const contracts = await Contracts.compile(
      config.with({ all: true, quiet: true })
    );
    assert.isNotNull(contracts["ENS"]);
    assert.isNotNull(contracts["MyContract"]);
    // test that relevant ethpm.locks are there?
  });

  // For each of these examples, sources exist. However, including sources isn't required. This test
  // treats the package as if it had no sources; to do so, we simply don't compile its code.
  // In addition, this package contains deployments. We need to make sure these deployments are available.
  it("successfully installs and provisions a deployed package with network artifacts from EthPM, without compiling v2", async () => {
    await Contracts.compile(config.with({ all: true, quiet: true }));
    config.ethpm_uri = `erc1319://${registry._address}:1/ens@1.0.0`;
    await PackageV3.install(config);

    // Make sure we can resolve it.
    var expected_contract_name = "ENSRegistry";
    var ENS = await config.resolver.require("ens/contracts/ENSRegistry.sol");
    assert.equal(
      ENS.contract_name,
      expected_contract_name,
      "Could not find provisioned contract with name '" +
        expected_contract_name +
        "'"
    );
    // Ensure we didn't resolve a local path.
    assert(
      !fs.existsSync(
        path.join(config.contracts_build_directory, "ENSRegistry.json")
      )
    );
  });

  it("handles deployments", async () => {
    await Contracts.compile(config.with({ all: true, quiet: true }));

    const installed_package = "ethregistrar";
    const expected_contract_name = "BaseRegistrarImplementation";
    config.ethpm_uri = `erc1319://${registry._address}:1/ethregistrar@1.0.1`;
    await PackageV3.install(config);

    var expected_manifest_path = path.join(
      config.working_directory,
      "_ethpm_packages",
      installed_package,
      "manifest.json"
    );

    const manifest = JSON.parse(
      fs.readFileSync(expected_manifest_path, "utf8")
    );
    const blockchainUri = Object.keys(manifest.deployments)[0];
    // Make sure the blockchain was inserted correctly (really a function of GithubExamples).
    assert.ok(
      manifest.deployments,
      "No deployments when a deployment was expected"
    );
    assert.ok(
      manifest.deployments[blockchainUri],
      "No deployments to the expected blockchain"
    );
    assert.ok(
      manifest.deployments[blockchainUri][expected_contract_name],
      expected_contract_name +
        " does not appear in deployed contracts for expected blockchain"
    );

    const BaseRegistrarImplementation = await config.resolver.require(
      "ethregistrar/contracts/BaseRegistrarImplementation.sol"
    );
    // Finally assert the address.
    assert.equal(
      BaseRegistrarImplementation.networks[blockchainUri].address,
      manifest.deployments[blockchainUri][expected_contract_name].address,
      "Address in contract doesn't match address in manifest"
    );
  });
});

describe("ethPM publish: ", function () {
  this.timeout(30000);
  let web3;
  let config;
  let provider;
  let registry;
  let owner;
  let accounts;

  beforeEach(
    "Create a Ganache provider, deploy a new registry, and get a blockchain uri",
    async () => {
      this.timeout(30000); // I've had varying runtimes with this block, likely due to networking.
      // setup
      // better comments everywhere
      provider = Ganache.provider();
      web3 = new Web3(provider);
      accounts = await web3.eth.getAccounts();
      owner = accounts[0];
      const registryFactory = new web3.eth.Contract(
        registryManifest.contract_types.PackageRegistry.abi
      );
      const deployment_bytecode =
        registryManifest.contract_types.PackageRegistry.deployment_bytecode
          .bytecode;
      registry = await registryFactory
        .deploy({ data: deployment_bytecode })
        .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });
    }
  );

  // Super slow doing these in a beforeEach, but it ensures nothing conflicts.
  beforeEach("Create a sandbox", async () => {
    this.timeout(20000);
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.network = "development";
    config.networks = {
      development: {
        network_id: provider.options.network_id,
        provider: provider,
        from: owner,
      },
    };
    config.ethpm = {
      ipfsHost: "ipfs.infura.io",
      ipfsPort: "5001",
      ipfsProtocol: "https",
      infuraKey: INFURA_KEY,
      registry: `ethpm://${registry._address}`,
    };
  });

  afterEach("Cleanup tmp files", function (done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  it("requires valid ethpm.json to publish", async () => {
    let counter = 0;
    await Contracts.compile(config.with({ all: true, quiet: true }));

    // Empty config
    fs.writeFileSync(
      path.join(config.working_directory, "ethpm.json"),
      JSON.stringify({}),
      "utf8"
    );
    await Migrate.run(config.with({ quiet: true }));
    try {
      await PackageV3.publish(config);
    } catch (error) {
      expect(error.message).to.include(
        "Invalid ethpm.json configuration detected."
      );
      counter++;
    }

    // Missing version field
    fs.writeFileSync(
      path.join(config.working_directory, "ethpm.json"),
      JSON.stringify({ package_name: "pkg" }),
      "utf8"
    );

    try {
      await PackageV3.publish(config.with({ version: "1" }));
    } catch (error) {
      expect(error.message).to.include(
        "Invalid ethpm.json configuration detected."
      );
      counter++;
    }
    // Missing package_name field
    fs.writeFileSync(
      path.join(config.working_directory, "ethpm.json"),
      JSON.stringify({ version: "1" }),
      "utf8"
    );

    try {
      await PackageV3.publish(config.with({ package_name: "pkg" }));
    } catch (error) {
      expect(error.message).to.include(
        "Invalid ethpm.json configuration detected."
      );
      counter++;
    }
    expect(counter).to.equal(3);
  });

  it("publishes a basic package", async () => {
    await Contracts.compile(config.with({ all: true, quiet: true }));
    const ethpmJson = JSON.stringify({
      package_name: "pkg",
      version: "1.0",
      meta: {
        description: "test",
        authors: ["me <me@gmail.com>"],
        keywords: ["test", "solidity", "truffle"],
        license: "mit",
        links: [
          {
            repo: "www.github.com",
            documentation: "www.readthedocs.com",
            website: "www.website.com",
          },
        ],
      },
    });
    fs.writeFileSync(
      path.join(config.working_directory, "ethpm.json"),
      ethpmJson,
      "utf8"
    );
    await Migrate.run(config.with({ quiet: true }));
    const pkg = await PackageV3.publish(config);
    expect(pkg).to.include.all.keys("package_name", "version");
    expect(pkg.package_name).to.equal("pkg");
    expect(pkg.version).to.equal("1.0");
    expect(pkg.manifest_version).to.equal("2");
    expect(pkg.meta.description).to.equal("test");
    expect(pkg.meta.authors).to.include("me <me@gmail.com>");
    expect(pkg.meta.authors).to.have.lengthOf(1);
    expect(pkg.meta.keywords).to.include("test", "solidity", "truffle");
    expect(pkg.meta.keywords).to.have.lengthOf(3);
    expect(pkg.meta.license).to.equal("mit");
    expect(pkg.sources).to.include({
      "./ConvertLib.sol":
        "ipfs://QmcGD9ynJr3fzYTdNoNygWzDBZEedeX3GUqmaEAi4Jrp6o",
    });
    expect(pkg.sources).to.include({
      "./MetaCoin.sol": "ipfs://QmQaTyKrqbePBsrtbhBYKeRnT7E5sTeNmMXCdtX8VSQLB8",
    });
    expect(pkg.sources).to.include({
      "./Migrations.sol":
        "ipfs://QmascrL8SoRJpMHJnjiCFSXwgEe6fR8oNUszKRGQy2nsnn",
    });
    expect(pkg.contract_types.ConvertLib).to.have.keys(
      "abi",
      "compiler",
      "natspec",
      "deployment_bytecode",
      "runtime_bytecode"
    );
    expect(pkg.contract_types.ConvertLib.compiler.settings.optimize).to.equal(
      true
    );
  });
});
