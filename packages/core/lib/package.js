const expect = require("@truffle/expect");
const TruffleError = require("@truffle/error");
const { EthPM } = require("ethpm");
const { Erc1319URI } = require("ethpm/utils/uri");
const { parseTruffleArtifacts } = require("ethpm/utils/truffle");
const path = require("path");
const fs = require("fs");

const Package = {
  install: async options => {
    expect.options(options.ethpm, ["ipfs_host", "ipfs_port", "ipfs_protocol"]);
    expect.options(options, ["working_directory", "ethpm_uri", "logger"]);

    // Create a web3 instance connected to a blockchain
    if (!options.provider && !options.ethpm.install_provider_uri) {
      throw new TruffleError("No provider or install_provider_uri found.");
    }
    const provider =
      options.provider ||
      new Web3.providers.HttpProvider(options.ethpm.install_provider_uri);

    // Parse ethpm uri
    const ethpmURI = new Erc1319URI(options.ethpm_uri);
    if (!ethpmURI.packageName && !ethpmURI.version) {
      throw new TruffleError(
        "Invalid ethPM uri. URIs must specify a package name and version to install."
      );
    }
    // Convert ens names

    // Create an ethpm instance
    const ethpm = await EthPM.configure({
      registries: "ethpm/registries/web3",
      installer: "ethpm/installer/truffle",
      storage: "ethpm/storage/ipfs"
    }).connect({
      provider: provider,
      workingDirectory: options.working_directory,
      registryAddress: ethpmURI.address,
      ipfs: {
        host: options.ethpm.ipfs_host,
        port: options.ethpm.ipfs_port,
        protocol: options.ethpm.ipfs_protocol
      }
    });

    // Validate target package is available on connected registry
    const availablePackages = await ethpm.registries.packages();
    if (!availablePackages.includes(ethpmURI.packageName)) {
      throw new TruffleError(
        "Package: " +
          ethpmURI.packageName +
          ", not found on registry at address: " +
          ethpmURI.address +
          ". Available packages include: " +
          availablePackages
      );
    }

    // Fetch target package manifest URI
    const manifestURI = await ethpm.registries
      .package(ethpmURI.packageName)
      .release(ethpmURI.version);

    // Install target manifest URI to working directory
    await ethpm.installer.install(manifestURI, ethpmURI.address);
    options.logger.log(
      `Installed ${ethpmURI.packageName}@${ethpmURI.version} to ${
        options.working_directory
      }`
    );
  },

  release: async options => {
    expect.options(options.ethpm, [
      "ipfs_host",
      "ipfs_port",
      "ipfs_protocol",
      "registry"
    ]);
    expect.options(options, [
      "working_directory",
      "contracts_directory",
      "contracts_build_directory",
      "networks",
      "network",
      "logger"
    ]);

    if (options.network !== "mainnet") {
      // validate is setup with mnemonic?
      // validate mnemonic has releasing rights for options.registry?
      throw new TruffleError(
        "Please add a mainnet provider with your 12 word mnemonic to truffle.js"
      );
    }

    // Create an ethpm instance
    let ethpm = await EthPM.configure({
      manifests: "ethpm/manifests/v2",
      storage: "ethpm/storage/ipfs",
      registries: "ethpm/registries/web3"
    }).connect({
      provider: options.networks.mainnet.provider,
      registryAddress: options.ethpm.registry,
      ipfs: {
        host: options.ethpm.ipfs_host,
        port: options.ethpm.ipfs_port,
        protocol: options.ethpm.ipfs_protocol
      }
    });

    let artifacts = releasable_artifacts(options);

    // Build sourcesConfig
    const sourcePaths = fs.readdirSync(options.contracts_directory);
    let sourcesConfig = {};
    for (const file of sourcePaths) {
      const targetPath = path.join(options.contracts_directory, file);
      const ipfsHash = await ethpm.storage.write(
        fs.readFileSync(targetPath).toString()
      );
      sourcesConfig[file] = ipfsHash.href;
    }

    // Fetch ethpm.json config
    let ethpmConfig;
    try {
      ethpmConfig = JSON.parse(
        fs.readFileSync(
          path.join(options.working_directory, "ethpm.json"),
          "utf8"
        )
      );
      if (
        ethpmConfig.package_name === undefined ||
        ethpmConfig.version === undefined
      ) {
        throw new Error(
          "Invalid ethpm.json: Must contain a 'package_name' and 'version'."
        );
      }
    } catch (e) {
      throw new Error("Invalid ethpm.json configuration detected.");
    }
    const ethpmFields = {
      sources: sourcesConfig,
      contract_types: artifacts.contract_types,
      deployments: artifacts.deployments,
      build_dependencies: {}
    };

    const targetConfig = Object.assign(ethpmFields, ethpmConfig);
    const pkg = await ethpm.manifests.read(JSON.stringify(targetConfig));
    const manifest = await ethpm.manifests.write(pkg);
    const manifestURI = await ethpm.storage.write(manifest);

    await ethpm.registries.registry.methods
      .release(ethpmConfig.package_name, ethpmConfig.version, manifestURI.href)
      .send({
        from: options.networks.mainnet.from,
        gas: 4712388,
        gasPrice: 100000000000
      });
    options.logger.log(
      `Released ${ethpmConfig.package_name}@${
        ethpmConfig.version
      } to registry @ ${options.ethpm.registry}`
    );
    return JSON.parse(manifest);
  }
};

// Returns a list of releasable artifacts
// aka contract_types and deployments found in all artifacts
function releasable_artifacts(options) {
  var files = fs.readdirSync(options.contracts_build_directory);
  files = files.filter(file => file.includes(".json"));

  if (!files.length) {
    var msg =
      "Could not locate any releasable artifacts in " +
      options.contracts_build_directory +
      ". " +
      "Run `truffle compile` before releasing.";

    return new Error(msg);
  }

  const fileData = [];
  const blockchainUri = options.networks.mainnet.network_id;
  for (let file of files) {
    const fileContents = JSON.parse(
      fs.readFileSync(
        path.join(options.contracts_build_directory, file),
        "utf8"
      )
    );
    // hacky af - blockchain uri wasn't getting picked up as network_id for 2 of 3 migrations
    // some artifacts are coming through w/ network ids that are ints
    // the blockchain uri coming through is what is set as the network_id
    // not a freshly created one with latest block via BlockchainUtils
    const foundNetworkId = Object.keys(fileContents.networks)[0];
    if (foundNetworkId !== blockchainUri) {
      delete Object.assign(fileContents.networks, {
        [blockchainUri]: fileContents.networks[foundNetworkId]
      })[foundNetworkId];
    }
    fileData.push(fileContents);
  }
  return parseTruffleArtifacts(fileData);
}

module.exports = Package;
