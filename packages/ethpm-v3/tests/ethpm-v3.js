var assert = require("chai").assert;
const expect = require("chai").expect;
var Box = require("@truffle/box");
var fs = require("fs-extra");
var glob = require("glob");
var path = require("path");
var Contracts = require("@truffle/workflow-compile");
const { EthPM } = require("ethpm");
var PackageV3 = require("@truffle/ethpm-v3");
const Ganache = require("ganache-core");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");
const Web3 = require("web3");
const registryManifest = require("ethpm/registries/web3/simple/registry.json");
const Migrate = require("@truffle/migrate");

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
    config.networks = {
      development: {
        network_id: provider.options.network_id,
        provider: provider,
        from: owner
      }
    };
    config.ethpm = {
      ipfsHost: "ipfs.infura.io",
      ipfsPort: "5001",
      ipfsProtocol: "https",
      registry: {
        network: "development"
      }
    };
  });

  beforeEach("Create a fake EthPM host and memory registry", async () => {
    this.timeout(30000); // I've had varying runtimes with this block, likely due to networking.
    const registryFactory = new web3.eth.Contract(
      registryManifest.contractTypes.PackageRegistry.abi
    );
    const deploymentBytecode =
      registryManifest.contractTypes.PackageRegistry.deploymentBytecode
        .bytecode;

    // deploy registry
    registry = await registryFactory
      .deploy({ data: deploymentBytecode })
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    config.ethpm.registry.address = registry._address;

    // publish ens@1.0.0
    await registry.methods
      .release(
        "ens",
        "1.0.0",
        "ipfs://QmQbwp9TyXdGKPKvTeK9w1VEy9SxHfLDfUDdErwApnNMds"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    // publish ethregistrar@1.0.1
    await registry.methods
      .release(
        "ethregistrar",
        "3.0.0",
        "ipfs://QmYraovUprvG69Ti8budkvTMq1avdZ8CaGPeVX3Z6JUE7K"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });
  });

  afterEach("Cleanup tmp files", async () => {
    glob("tmp-*", (err, files) => {
      files.forEach(file => fs.unlinkSync(file));
    });
  });

  it("lists available packages", async () => {
    let consoleOutput = [];
    const originalLog = config.logger.log;
    const mockedLog = output => consoleOutput.push(output);
    config.logger.log = mockedLog;
    await PackageV3.packages(config);
    expect(consoleOutput[0]).to.include(
      "Searching for packages published on registry located at:"
    );
    expect(consoleOutput[1]).to.include("Registry controlled by account:");
    expect(consoleOutput[2]).to.include("Package: ens");
    expect(consoleOutput[3]).to.include(
      "- 1.0.0 @ ipfs://QmQbwp9TyXdGKPKvTeK9w1VEy9SxHfLDfUDdErwApnNMds"
    );
    expect(consoleOutput[4]).to.include("Package: ethregistrar");
    expect(consoleOutput[5]).to.include(
      "- 3.0.0 @ ipfs://QmYraovUprvG69Ti8budkvTMq1avdZ8CaGPeVX3Z6JUE7K"
    );
    config.logger.log = originalLog;
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
        from: owner
      }
    };
    config.ethpm = {
      registry: {
        network: "development"
      },
      ipfsHost: "ipfs.infura.io",
      ipfsPort: "5001",
      ipfsProtocol: "https"
    };
  });

  beforeEach("Create a fake EthPM host and memory registry", async () => {
    this.timeout(30000); // I've had varying runtimes with this block, likely due to networking.
    const registryFactory = new web3.eth.Contract(
      registryManifest.contractTypes.PackageRegistry.abi
    );
    const deploymentBytecode =
      registryManifest.contractTypes.PackageRegistry.deploymentBytecode
        .bytecode;

    // deploy registry
    registry = await registryFactory
      .deploy({ data: deploymentBytecode })
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    config.ethpm.registry.address = registry._address;

    // publish ens@1.0.0
    await registry.methods
      .release(
        "ens",
        "1.0.0",
        "ipfs://QmQbwp9TyXdGKPKvTeK9w1VEy9SxHfLDfUDdErwApnNMds"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });

    // publish ethregistrar@1.0.1
    await registry.methods
      .release(
        "ethregistrar",
        "3.0.0",
        "ipfs://QmYraovUprvG69Ti8budkvTMq1avdZ8CaGPeVX3Z6JUE7K"
      )
      .send({ from: owner, gas: 4712388, gasPrice: 100000000000 });
  });

  afterEach("Cleanup tmp files", async () => {
    glob("tmp-*", (err, files) => {
      files.forEach(file => fs.unlinkSync(file));
    });
  });

  it("requires a valid package name and version to install", async () => {
    config.packageId = `erc1319://${registry._address}:1`;
    try {
      await PackageV3.install(config);
    } catch (error) {
      expect(error.message).to.include(
        "Invalid ethpm uri. To install from an ethpm uri, you must at least provide the package name to install."
      );
    }
  });

  it("invalidates ethpm uris for packages not published on itself", async () => {
    config.packageId = `erc1319://${registry._address}:1/invalid@1.0.0`;
    try {
      await PackageV3.install(config);
    } catch (error) {
      expect(error.message).to.include(
        "Package: invalid, not found on registry"
      );
    }
  });

  it("successfully installs single dependency from EthPM", async () => {
    config.packageId = `erc1319://${registry._address}:1/ens@1.0.0`;
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

  it("successfully installs and provisions a package with dependencies from EthPMv3", async () => {
    config.packageId = `erc1319://${registry._address}:1/ens@1.0.0`;
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
  it("successfully installs and provisions a deployed package with network artifacts from EthPM, without compiling v3", async () => {
    await Contracts.compile(config.with({ all: true, quiet: true }));
    config.packageId = `erc1319://${registry._address}:1/ens@1.0.0`;
    await PackageV3.install(config);

    // Make sure we can resolve it.
    var expectedContractName = "ENSRegistry";
    var ENS = await config.resolver.require("ens/contracts/ENSRegistry.sol");
    assert.equal(
      ENS.contract_name,
      expectedContractName,
      "Could not find provisioned contract with name '" +
        expectedContractName +
        "'"
    );
    // Ensure we didn't resolve a local path.
    assert.ok(
      fs.existsSync(
        path.join(config.contracts_build_directory, "ENSRegistry.json")
      )
    );
  });

  it("handles deployments", async () => {
    await Contracts.compile(config.with({ all: true, quiet: true }));

    const installed_package = "ethregistrar";
    const expected_contract_name = "BaseRegistrarImplementation";
    config.packageId = `erc1319://${registry._address}:1/ethregistrar@3.0.0`;
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
      "ethregistrar/BaseRegistrarImplementation.sol"
    );
    // Finally assert the address.
    assert.equal(
      BaseRegistrarImplementation.networks["1"].address,
      manifest.deployments[blockchainUri][expected_contract_name].address,
      "Address in contract doesn't match address in manifest"
    );
  });
});

describe("ethpm publish: ", function () {
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
      provider = Ganache.provider();
      web3 = new Web3(provider);
      accounts = await web3.eth.getAccounts();
      owner = accounts[0];
      const registryFactory = new web3.eth.Contract(
        registryManifest.contractTypes.PackageRegistry.abi
      );
      const deploymentBytecode =
        registryManifest.contractTypes.PackageRegistry.deploymentBytecode
          .bytecode;
      registry = await registryFactory
        .deploy({ data: deploymentBytecode })
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
        from: owner
      }
    };
    config.ethpm = {
      ipfsHost: "ipfs.infura.io",
      ipfsPort: "5001",
      ipfsProtocol: "https",
      registry: {
        address: registry._address,
        network: "development"
      }
    };
  });

  afterEach("Cleanup tmp files", async () => {
    glob("tmp-*", (err, files) => {
      files.forEach(file => fs.unlinkSync(file));
    });
  });

  it("requires valid ethpm.json to publish", async () => {
    let counter = 0;
    await Contracts.compile(config.with({ quiet: true }));

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
    // Missing name field
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
    let consoleOutput = [];
    const originalLog = config.logger.log;
    const mockedLog = output => consoleOutput.push(output);
    config.logger.log = mockedLog;

    await Contracts.compile(config.with({ quiet: true }));
    const ethpmJson = JSON.stringify({
      name: "pkg",
      version: "1.0.0",
      meta: {
        description: "test",
        authors: ["me <me@gmail.com>"],
        keywords: ["test", "solidity", "truffle"],
        license: "mit",
        links: [
          {
            repo: "www.github.com",
            documentation: "www.readthedocs.com",
            website: "www.website.com"
          }
        ]
      }
    });
    fs.writeFileSync(
      path.join(config.working_directory, "ethpm.json"),
      ethpmJson,
      "utf8"
    );
    await Migrate.run(config.with({ quiet: true }));
    await PackageV3.publish(config);
    expect(consoleOutput[2]).to.include("Publishing package to registry");
    expect(consoleOutput[3]).to.include("Published pkg@1.0.0 to");
    config.logger.log = originalLog;

    const ethpm = await EthPM.configure({
      manifests: "ethpm/manifests/v3",
      storage: "ethpm/storage/ipfs",
      registries: "ethpm/registries/web3"
    }).connect({
      provider: provider,
      registryAddress: config.ethpm.registry.address,
      ipfs: {
        host: config.ethpm.ipfsHost,
        port: config.ethpm.ipfsPort,
        protocol: config.ethpm.ipfsProtocol
      }
    });

    // validate fields of published manifest
    const manifestUri = await ethpm.registries.package("pkg").release("1.0.0");
    const rawManifest = await ethpm.storage.read(manifestUri);
    const pkg = JSON.parse(rawManifest);
    expect(pkg.name).to.equal("pkg");
    expect(pkg.version).to.equal("1.0.0");
    expect(pkg.manifest).to.equal("ethpm/3");
    expect(pkg.meta.description).to.equal("test");
    expect(pkg.meta.authors).to.include("me <me@gmail.com>");
    expect(pkg.meta.authors).to.have.lengthOf(1);
    expect(pkg.meta.keywords).to.include("test", "solidity", "truffle");
    expect(pkg.meta.keywords).to.have.lengthOf(3);
    expect(pkg.meta.license).to.equal("mit");
    expect(pkg.sources["ConvertLib.sol"]).to.eql({
      installPath: "./ConvertLib.sol",
      type: "solidity",
      urls: ["ipfs://QmcGD9ynJr3fzYTdNoNygWzDBZEedeX3GUqmaEAi4Jrp6o"]
    });
    expect(pkg.sources["MetaCoin.sol"]).to.eql({
      installPath: "./MetaCoin.sol",
      type: "solidity",
      urls: ["ipfs://QmQaTyKrqbePBsrtbhBYKeRnT7E5sTeNmMXCdtX8VSQLB8"]
    });
    expect(pkg.sources["Migrations.sol"]).to.eql({
      installPath: "./Migrations.sol",
      type: "solidity",
      urls: ["ipfs://QmascrL8SoRJpMHJnjiCFSXwgEe6fR8oNUszKRGQy2nsnn"]
    });
    //expect(pkg).to.have.keys("compilers")
    expect(pkg.contractTypes.ConvertLib).to.have.keys(
      "abi",
      "devdoc",
      "userdoc",
      "deploymentBytecode",
      "runtimeBytecode"
    );
  });
});
