const expect = require("@truffle/expect");
const Artifactor = require("@truffle/artifactor");
const TruffleError = require("@truffle/error");
const { EthPM } = require("ethpm");
const semver = require("semver");
const Web3 = require("web3");
const path = require("path");
const fs = require("fs");
const { isAddress } = require("web3-utils");
const TruffleContractSchema = require("@truffle/contract-schema");
const utils = require("./utils");

const PackageV3 = {
  packages: async options => {
    try {
      expect.options(options, [
        "ethpm",
        "logger",
        "working_directory",
        "contracts_build_directory",
        "networks"
      ]);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "registry"
      ]);
      expect.options(options.ethpm.registry, ["address", "network"]);
      expect.options(options.networks, [options.ethpm.registry.network]);
      expect.options(options.networks[options.ethpm.registry.network], [
        "provider",
        "network_id"
      ]);
    } catch (err) {
      throw new TruffleError(
        `Invalid ethpm configuration in truffle-config: ${err.message}`
      );
    }

    let targetRegistry;
    if (!isAddress(options.ethpm.registry.address)) {
      targetRegistry = await utils.resolveEnsName(
        options.ethpm.registry.address,
        provider,
        options
      );
    } else {
      targetRegistry = options.ethpm.registry.address;
    }

    var provider = utils.pluckProviderFromConfig(options);

    // Create an ethpm instance
    let ethpm;
    try {
      ethpm = await EthPM.configure({
        registries: "ethpm/registries/web3"
      }).connect({
        provider: provider,
        workingDirectory: options.working_directory,
        registryAddress: targetRegistry,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol
        }
      });
    } catch (err) {
      throw new TruffleError(`Unable to configure ethpm: ${err.message}`);
    }

    // Display info about connected registry
    options.logger.log(
      `Searching for packages published on registry located at: ${targetRegistry}`
    );
    const owner = await ethpm.registries.registry.methods.owner().call();
    options.logger.log(`Registry controlled by account: ${owner}`);

    // Display all packages from connected registry
    const allPackages = await ethpm.registries.packages();
    for (var i = 0; i < allPackages.length; i++) {
      const packageName = allPackages[i];
      const allReleases = await ethpm.registries
        .package(packageName)
        .releases();
      options.logger.log(`Package: ${packageName}`);
      Object.keys(allReleases).forEach(function (key, _) {
        options.logger.log(`  - ${key} @ ${allReleases[key]}`);
      });
    }
    return;
  },

  install: async options => {
    try {
      expect.options(options, [
        "ethpm",
        "packageIdentifier",
        "logger",
        "working_directory",
        "contracts_build_directory",
        "networks"
      ]);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "registry"
      ]);
      expect.options(options.ethpm.registry, ["address", "network"]);
      expect.options(options.networks, [options.ethpm.registry.network]);
      expect.options(options.networks[options.ethpm.registry.network], [
        "provider",
        "network_id"
      ]);
    } catch (err) {
      throw new TruffleError(
        `Invalid ethpm configuration in truffle-config: ${err.message}`
      );
    }

    options.logger.log(
      `! Please use caution when interacting with installed packages.\n! Only use packages that are published on trusted registries, or whose assets you've verified directly.`
    );
    options.logger.log("Fetching package manifest...");
    var targetNetwork = options.ethpm.registry.network;
    var targetNetworkId = options.networks[targetNetwork].network_id;
    var provider = utils.pluckProviderFromConfig(options);

    let targetRegistry;
    if (!isAddress(options.ethpm.registry.address)) {
      targetRegistry = await utils.resolveEnsName(
        options.ethpm.registry.address,
        provider,
        options
      );
    } else {
      targetRegistry = options.ethpm.registry.address;
    }
    // Create an ethpm instance
    let ethpm;
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v3",
        registries: "ethpm/registries/web3",
        installer: "ethpm/installer/truffle",
        storage: "ethpm/storage/ipfs"
      }).connect({
        provider: provider,
        workingDirectory: options.working_directory,
        registryAddress: targetRegistry,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol
        }
      });
    } catch (err) {
      throw new TruffleError(`Unable to configure ethpm: ${err.message}`);
    }

    let manifestUri;
    let targetPackageName;
    let targetVersion;
    var resolvedManifestUri = false;

    // Parse IPFS URI
    if (options.packageIdentifier.startsWith("ipfs://")) {
      manifestUri = new URL(options.packageIdentifier);
      resolvedManifestUri = true;
    }

    // Parse ethpm URI || packageIdentifier
    if (!resolvedManifestUri) {
      // Parse ethpm uri
      if (
        options.packageIdentifier.startsWith("ethpm://") ||
        options.packageIdentifier.startsWith("erc1319://")
      ) {
        const targetInstallInfo = await utils.resolveEthpmUri(
          options,
          provider
        );
        targetPackageName = targetInstallInfo.targetPackageName;
        targetVersion = targetInstallInfo.targetVersion;
        targetRegistry = targetInstallInfo.targetRegistry;
        targetNetworkId = targetInstallInfo.targetNetworkId;
        // update provider if changed via ethpm uri
        provider = targetInstallInfo.targetProvider;
      } else {
        // Parse packageIdentifier
        const packageData = options.packageIdentifier.split("@");
        if (packageData.length > 2) {
          throw new TruffleError(
            `Invalid ethpm uri or package id: ${options.packageIdentifier[0]}`
          );
        }

        if (!targetRegistry || !targetNetworkId) {
          throw new TruffleError(
            `Missing an 'ethpm/registry/address' and 'ethpm/registry/network' in your truffle config for the target registry.`
          );
        }
        targetPackageName = packageData[0];
        targetVersion = packageData[1];
      }
    }

    // Update the ethpm instance with new registry address
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v3",
        registries: "ethpm/registries/web3",
        installer: "ethpm/installer/truffle",
        storage: "ethpm/storage/ipfs"
      }).connect({
        provider: provider,
        workingDirectory: options.working_directory,
        registryAddress: targetRegistry,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol
        }
      });
    } catch (err) {
      throw new TruffleError(`Unable to configure ethpm: ${err.message}`);
    }

    if (!resolvedManifestUri) {
      // Validate target package is available on connected registry
      const availablePackages = await ethpm.registries.packages();
      if (!availablePackages.includes(targetPackageName)) {
        throw new TruffleError(
          `Package: ${targetPackageName}, not found on registry at address: ${targetRegistry}. Available packages include: ${availablePackages}`
        );
      }

      // If no version provided, install Latest
      if (typeof targetVersion === "undefined") {
        const allReleases = await ethpm.registries
          .package(targetPackageName)
          .releases();
        try {
          targetVersion = semver.maxSatisfying(Object.keys(allReleases), "*");
        } catch (err) {
          throw new TruffleError(
            `Releases on active version do not look like semver. Please specify a version of the package you want to install.`
          );
        }
      }

      // Fetch target package manifest URI
      manifestUri = await ethpm.registries
        .package(targetPackageName)
        .release(targetVersion);
    }

    // Check to make sure a manifest URI was located
    if (typeof manifestUri === "undefined") {
      throw new TruffleError(
        `Unable to find a manifest URI for package ID: ${options.packageIdentifier}`
      );
    }

    // Install target manifest URI to working directory
    try {
      await ethpm.installer.install(manifestUri, targetRegistry, options.alias);
    } catch (err) {
      throw new TruffleError(`Install error: ${err.message}`);
    }

    // Add contract types and deployments to artifactor
    const manifest = await ethpm.storage.read(manifestUri);
    const ethpmPackage = await ethpm.manifests.read(manifest.toString());

    let installMessage;
    if (!options.alias) {
      installMessage = `Installed ${ethpmPackage.packageName}@${ethpmPackage.version}`;
    } else {
      installMessage = `Installed ${ethpmPackage.packageName}@${ethpmPackage.version} under alias: ${options.alias}`;
    }
    options.logger.log(installMessage);

    const artifactor = new Artifactor(options.contracts_build_directory);
    // convert blockchainUri => network id
    const normalizedDeployments = {};

    if (ethpmPackage.deployments) {
      ethpmPackage.deployments.forEach((value, key, _) => {
        const foundGenesisBlock = key.host.toLowerCase();
        if (foundGenesisBlock in utils.SUPPORTED_GENESIS_BLOCKS) {
          normalizedDeployments[
            utils.SUPPORTED_GENESIS_BLOCKS[foundGenesisBlock]
          ] = value;
        }
      });
    }

    for (let contractType in ethpmPackage.contractTypes) {
      const contractData = ethpmPackage.contractTypes[contractType];
      const contractDeployments = {};
      for (let networkId of Object.keys(normalizedDeployments)) {
        for (let deployment of Object.values(
          normalizedDeployments[networkId]
        )) {
          if (deployment.contractType === contractType) {
            contractDeployments[networkId] = {
              address: deployment.address
              // links && events
            };
          }
        }
      }
      const contractSchema = utils.convertContractTypeToContractSchema(
        contractData,
        contractDeployments
      );

      let normalizedContractSchema;
      try {
        normalizedContractSchema = await TruffleContractSchema.normalize(
          contractSchema,
          { validate: true }
        );
      } catch (err) {
        throw new TruffleError(`Truffle abi validation error: ${err.message}`);
      }

      // mkdir contracts_build_directory instead of running compile
      if (!fs.existsSync(options.contracts_build_directory)) {
        const build_directory = path.join(
          options.contracts_build_directory,
          ".."
        );
        if (!fs.existsSync(build_directory)) {
          fs.mkdirSync(build_directory);
        }
        fs.mkdirSync(options.contracts_build_directory);
      }
      try {
        await artifactor.save(normalizedContractSchema);
      } catch (err) {
        throw new TruffleError(
          `Error saving ethpm package artifacts: ${err.message}`
        );
      }
    }
    options.logger.log("Saved artifacts.");
    return;
  },

  publish: async options => {
    try {
      expect.options(options, [
        "contracts_build_directory",
        "contracts_directory",
        "ethpm",
        "logger",
        "networks",
        "working_directory"
      ]);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "registry"
      ]);
      expect.options(options.ethpm.registry, ["address", "network"]);
      expect.options(options.networks, [options.ethpm.registry.network]);
      expect.options(options.networks[options.ethpm.registry.network], [
        "provider",
        "network_id"
      ]);
    } catch (err) {
      throw new TruffleError(
        `Invalid ethpm configuration in truffle-config: ${err.message}`
      );
    }

    var registryProvider = utils.pluckProviderFromConfig(options);
    let targetRegistry;
    if (!isAddress(options.ethpm.registry.address)) {
      targetRegistry = await utils.resolveEnsName(
        options.ethpm.registry.address,
        registryProvider,
        options
      );
    } else {
      targetRegistry = options.ethpm.registry.address;
    }

    // Create an ethpm instance
    let ethpm;
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v3",
        storage: "ethpm/storage/ipfs",
        registries: "ethpm/registries/web3"
      }).connect({
        provider: registryProvider,
        registryAddress: targetRegistry,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol
        }
      });
    } catch (err) {
      throw new TruffleError(`Unable to configure ethpm: ${err.message}`);
    }

    options.logger.log("Finding publishable artifacts...");
    let artifacts;
    try {
      artifacts = await utils.getPublishableArtifacts(options, ethpm);
    } catch (err) {
      throw new TruffleError(
        `Unable to collect artifacts: ${err}. Try compiling your contracts.`
      );
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
        typeof ethpmConfig.name === "undefined" ||
        typeof ethpmConfig.version === "undefined"
      ) {
        throw new TruffleError(
          "Invalid ethpm.json: Must contain a 'name' and 'version'."
        );
      }
    } catch (err) {
      throw new TruffleError("Invalid ethpm.json configuration detected.");
    }

    // Includes all installed ethpm packages in published package
    const buildDependencies = utils.fetchInstalledBuildDependencies(
      options.working_directory
    );

    const ethpmFields = {
      sources: artifacts.resolvedSources,
      contractTypes: artifacts.resolvedContractTypes,
      compilers: artifacts.resolvedCompilers,
      deployments: artifacts.resolvedDeployments,
      buildDependencies: buildDependencies
    };

    options.logger.log(`Generating package manifest...`);
    const targetConfig = Object.assign(ethpmFields, ethpmConfig);
    let pkg;
    let manifest;
    let manifestUri;
    try {
      pkg = await ethpm.manifests.read(JSON.stringify(targetConfig));
      manifest = await ethpm.manifests.write(pkg);
      manifestUri = await ethpm.storage.write(manifest);
    } catch (err) {
      throw new TruffleError(
        `Error generating manifest from contract artifacts: ${err}`
      );
    }

    options.logger.log(`Publishing package to registry...`);
    const w3 = new Web3(registryProvider);
    const fromAddress = await w3.eth.getCoinbase();
    const encodedTxData = ethpm.registries.registry.methods
      .release(ethpmConfig.name, ethpmConfig.version, manifestUri.href)
      .encodeABI();
    try {
      await w3.eth.sendTransaction({
        from: fromAddress,
        to: targetRegistry,
        gas: 4712388,
        gasPrice: 100000000000,
        data: encodedTxData
      });
    } catch (err) {
      options.logger.log(`Error publishing release data to registry: ${err}`);
      return;
    }
    options.logger.log(
      `Published ${ethpmConfig.name}@${ethpmConfig.version} to ${targetRegistry}\n`
    );
    return;
  }
};

module.exports = PackageV3;
