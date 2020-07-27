"use strict";
const expect = require("@truffle/expect");
//const Artifactor = require("@truffle/artifactor");
const TruffleError = require("@truffle/error");
//const Contracts = require("@truffle/workflow-compile");
const { EthPM } = require("ethpm");
const { EthpmURI } = require("ethpm/utils/uri");
const { parseTruffleArtifacts } = require("ethpm/utils/truffle");
const Web3 = require("web3");
const { isAddress } = require("web3-utils");
const path = require("path");
const fs = require("fs");
const ENSJS = require("ethereum-ens");
//const TruffleContractSchema = require("@truffle/contract-schema");

const SUPPORTED_CHAIN_IDS = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  5: "goerli",
  42: "kovan",
};

//const SUPPORTED_GENESIS_BLOCKS = {
//"d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3": 1,
//"41941023680923e0fe4d74a34bdac8141f2540e3ae90623718e47d66d1ca4a2d": 3,
//"6341fd3daf94b748c72ced5a5b26028f2474f5f00d824504e4fa37a75767e177": 4,
//"bf7e331f7f7c1dd2e05159666b3bf8bc7a8a3a9eb1d518969eab529dd9b88c1a": 5,
//"a3c565fc15c7478862d50ccd6561e3c06b24cc509bf388941c25ea985ce32cb9": 42,
/*};*/

const PackageV3 = {
  packages: async (options, done) => {
    console.log("V3 PACKAGES");
    try {
      expect.options(options, [
        "ethpm", // default ethpm settings
        "ens", // do we need this?
        "logger",
        "working_directory", // do we need this?
        "contracts_build_directory", // do we need this?
        "network",
        "networks", // is this required? how can we ensure network_id is available?
      ]);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "infuraKey",
        "registryAddress",
      ]);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    // Get network id from truffle-config
    const network = options.network;
    const networkId = options.networks[network].network_id;

    // Create a web3 instance connected to the ethpm uri's registry blockchain
    const infuraUri = getInfuraEndpointForChainId(
      networkId,
      options.ethpm.infuraKey
    );
    // TODO should we use provider from truffle-config?
    const provider = new Web3.providers.HttpProvider(infuraUri, {
      keepAlive: true,
    });

    // Create an ethpm instance
    let ethpm;
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v3",
        registries: "ethpm/registries/web3",
      }).connect({
        provider: provider,
        workingDirectory: options.working_directory,
        registryAddress: options.ethpm.registryAddress,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol,
        },
      });
    } catch (err) {
      done(new TruffleError(`Unable to configure ethPM: ${err.message}`));
    }

    // Get all packages on connected registry
    const allPackages = await ethpm.registries.packages();
    var allReleases = {};
    for (var i = 0; i < allPackages.length; i++) {
      const pkg = allPackages[i];
      const releases = await ethpm.registries.package(pkg).releases();
      allReleases[pkg] = releases;
    }
    // TODO: improve display
    options.logger.log(allReleases);
  },

  install: async (options, done) => {
    console.log("V3 INSTALL");
    try {
      expect.options(options, [
        "ethpm", // default ethpm settings
        // TODO: update to ethpmuri_or_id (xx@1.0)
        "ethpmUri", // target uri to install
        "ens",
        "logger",
        "working_directory",
        "contracts_build_directory",
      ]);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "infuraKey",
        "registryUri",
      ]);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    // Parse ethpm uri
    options.logger.log("Fetching package manifest...");
    let packageNameToInstall;
    let packageVersionToInstall;
    let registryAddress;
    let registryNetworkId;

    // Handle ethpm uri
    // NOTE: ethpm uri registry overrides registry found in truffle-config
    try {
      const ethpmUri = new EthpmURI(options.ethpmUri);

      // TODO snakecase?
      if (!ethpmUri.package_name && !ethpmUri.version) {
        done(
          new TruffleError(
            "Invalid ethPM uri. URIs must specify a package name and version to install."
          )
        );
      }

      packageNameToInstall = ethpmUri.packageName;
      packageVersionToInstall = ethpmUri.version;
      registryAddress = ethpmUri.address;
      registryNetworkId = ethpmUri.chainId;
    } catch (err) {
      // Hande package id (xxx@1.0.0)
      const packageData = options.ethpmUri.split("@");
      if (packageData.length != 2) {
        // TODO make better error message - how to make a proper uri / id
        done(
          new TruffleError(
            `Invalid ethpm uri or package id: ${options.ethpmUri}`
          )
        );
      }
      // Get network id from truffle-config
      const network = options.network;
      const networkId = options.networks[network].network_id;

      if (
        typeof options.ethpm.registryAddress === "undefined" ||
        typeof networkId === "undefined"
      ) {
        // TODO useful doc link
        done(
          new TruffleError(
            `Please provide a registryAddress in your ethpm truffle config where you want to publish your package.`
          )
        );
      }
      packageNameToInstall = packageData[0];
      packageVersionToInstall = packageData[1];
      registryAddress = options.ethpm.registryAddress;
      registryNetworkId = networkId;
    }

    // Create a web3 instance connected to the ethpm uri's registry blockchain
    const infuraUri = getInfuraEndpointForChainId(
      registryNetworkId,
      options.ethpm.infuraKey
    );
    const provider = new Web3.providers.HttpProvider(infuraUri, {
      keepAlive: true,
    });

    // Resolve ENS names in ethpm uri
    if (!isAddress(registryAddress)) {
      if (registryNetworkId !== 1) {
        done(
          new TruffleError(
            // TODO if using ens
            "Invalid ethPM uri. ethPM URIs must use a contract address for registries that are not on the mainnet."
          )
        );
      }
      if (options.ens.enabled === false) {
        done(
          new TruffleError(
            "Invalid ethPM uri. ENS must be enabled in truffle-config to use ethPM uris with ENS names."
          )
        );
      }
      try {
        const ensjs = new ENSJS(provider, options.ens.registryAddress);
        registryAddress = await ensjs.resolver(registryAddress).addr();
      } catch (err) {
        done(new TruffleError(`Unable to resolve uri: ${err.message}`));
      }
    }

    // Create an ethpm instance
    let ethpm;
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v3",
        registries: "ethpm/registries/web3",
        installer: "ethpm/installer/truffle",
        storage: "ethpm/storage/ipfs",
      }).connect({
        provider: provider,
        workingDirectory: options.working_directory,
        registryAddress: registryAddress,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol,
        },
      });
    } catch (err) {
      done(new TruffleError(`Unable to configure ethPM: ${err.message}`));
    }

    // Validate target package is available on connected registry
    const availablePackages = await ethpm.registries.packages();
    if (!availablePackages.includes(packageNameToInstall)) {
      done(
        new TruffleError(
          `Package: ${packageNameToInstall}, not found on registry at address: ${registryAddress}. Available packages include: ${availablePackages}`
        )
      );
    }

    // Fetch target package manifest URI
    const manifestUri = await ethpm.registries
      .package(packageNameToInstall)
      .release(packageVersionToInstall);

    // Install target manifest URI to working directory
    try {
      await ethpm.installer.install(manifestUri, registryAddress);
    } catch (err) {
      done(new TruffleError(`Install error: ${err.message}`));
    }
    options.logger.log(
      `Installed ${packageNameToInstall}@${packageVersionToInstall} to ${options.working_directory}`
    );

    //// Add contract types and deployments to artifactor
    //const manifest = await ethpm.storage.read(manifestUri);
    //const ethpmPackage = await ethpm.manifests.read(manifest.toString());

    //// compilation / build dir needs to happen before saving artifacts!
    //await Contracts.compile(options.with({ all: true, quiet: true }));
    //const artifactor = new Artifactor(options.contracts_build_directory);

    //// convert blockchainUri => network id
    //const normalizedDeployments = {};

    //if (ethpmPackage.deployments) {
    //ethpmPackage.deployments.forEach((value, key, _) => {
    //const foundGenesisBlock = key.host.toLowerCase();
    //if (!(foundGenesisBlock in SUPPORTED_GENESIS_BLOCKS)) {
    //done(
    //new TruffleError(
    //`Blockchain uri detected with unsupported genesis block: ${foundGenesisBlock}`
    //)
    //);
    //}
    //normalizedDeployments[
    //SUPPORTED_GENESIS_BLOCKS[foundGenesisBlock]
    //] = value;
    //});
    //}
    //for (let contractType in ethpmPackage.contractTypes) {
    //const contractData = ethpmPackage.contractTypes[contractType];
    //const contractDeployments = {};
    //for (let networkId of Object.keys(normalizedDeployments)) {
    //for (let deployment of Object.values(
    //normalizedDeployments[networkId]
    //)) {
    //if (deployment.contractType === contractType) {
    //contractDeployments[networkId] = {
    //address: deployment.address
    //// links && events
    //};
    //}
    //}
    //}
    //const contractSchema = convertContractTypeToContractSchema(
    //contractData,
    //contractDeployments
    //);

    //// seems like abi validation is too strict / outdated?
    ////try {
    ////await TruffleContractSchema.validate(contractSchema);
    ////} catch (err) {
    ////done(new TruffleError(`ethPM package import error: ${err.message}`));
    ////}
    //await artifactor.save(contractSchema);
    /*}*/
    options.logger.log("Saved artifacts.");
    done();
  },

  publish: async (options, done) => {
    console.log("V3 PUBLISH");
    try {
      expect.options(options, [
        "contracts_build_directory",
        "contracts_directory",
        "ethpm",
        "logger",
        "network",
        "networks",
        "working_directory",
      ]);
      console.log(options.ethpm);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "registryUri",
        "infuraKey",
      ]);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    const registryUri = new EthpmURI(options.ethpm.registryUri);
    const registryProviderUri = getInfuraEndpointForChainId(
      registryUri.chainId,
      options.ethpm.infuraKey
    );
    registryProvider = new Web3.providers.HttpProvider(registryProviderUri, {
      keepAlive: true,
    });

    let ethpm;
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v3",
        storage: "ethpm/storage/ipfs",
        registries: "ethpm/registries/web3",
      }).connect({
        provider: registryProvider,
        registryAddress: registryUri.address,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol,
        },
      });
    } catch (err) {
      done(new TruffleError(`Unable to configure ethPM: ${err.message}`));
    }

    options.logger.log("Finding publishable artifacts...");
    let artifacts;
    try {
      artifacts = await getPublishableArtifacts(options, ethpm);
    } catch (err) {
      done(new TruffleError(`Unable to collect artifacts: ${err}`));
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
        done(
          new TruffleError(
            "Invalid ethpm.json: Must contain a 'name' and 'version'."
          )
        );
      }
    } catch (err) {
      done(new TruffleError("Invalid ethpm.json configuration detected."));
    }

    // Includes all installed ethpm packages in published package
    const buildDependencies = fetchInstalledBuildDependencies(
      options.working_directory
    );

    const ethpmFields = {
      sources: artifacts.resolvedSources,
      contractTypes: artifacts.resolvedContractTypes,
      deployments: artifacts.resolvedDeployments,
      buildDependencies: buildDependencies,
    };

    options.logger.log(`Generating package manifest...`);
    const targetConfig = Object.assign(ethpmFields, ethpmConfig);
    const pkg = await ethpm.manifests.read(JSON.stringify(targetConfig));
    const manifest = await ethpm.manifests.write(pkg);
    //const manifestUri = await ethpm.storage.write(manifest);
    console.log("generated manifest");
    console.log(manifest);

    options.logger.log(`Publishing package to registry...`);
    /*    try {*/
    //const w3 = new Web3(options.provider);
    //const encodedTxData = ethpm.registries.registry.methods
    //.release(
    //ethpmConfig.package_name,
    //ethpmConfig.version,
    //manifestUri.href
    //)
    //.encodeABI();
    //const tx = await w3.eth.signTransaction({
    //from: options.provider.addresses[0],
    //to: registryUri.address,
    //gas: 4712388,
    //gasPrice: 100000000000,
    //data: encodedTxData
    //});
    //await w3.eth.sendSignedTransaction(tx.raw);
    //} catch (err) {
    //done(
    //new TruffleError(
    //`Error publishing package: ${err}.\nDoes ${
    //ethpmConfig.package_name
    //}@${ethpmConfig.version} already exist on registry: ${
    //registryUri.raw
    //}?`
    //)
    //);
    /*    }*/
    done(
      options.logger.log(
        `Published ${ethpmConfig.package_name}@${ethpmConfig.version} to ${registryUri.raw}`
      )
    );
  },
};

// Returns a list of publishable artifacts
// aka contractTypes and deployments found in all artifacts
async function getPublishableArtifacts(options, ethpm) {
  var files = fs.readdirSync(options.contracts_build_directory);
  files = files.filter(file => file.includes(".json"));

  if (!files.length) {
    var msg = `Could not locate any publishable artifacts in ${options.contracts_build_directory}. Run "truffle compile" before publishing.`;
    return new TruffleError(msg);
  }

  const artifactsGroupedByNetworkId = {};
  const sourcePaths = {};

  // group artifacts by network id to ensure consistency when converting networkId => blockchainUri
  for (let file of files) {
    const fileContents = JSON.parse(
      fs.readFileSync(
        path.join(options.contracts_build_directory, file),
        "utf8"
      )
    );

    sourcePaths[fileContents.sourcePath] = fileContents.source;
    const foundNetworkId = Object.keys(fileContents.networks)[0];
    if (foundNetworkId in artifactsGroupedByNetworkId) {
      artifactsGroupedByNetworkId[foundNetworkId].push(fileContents);
    } else {
      artifactsGroupedByNetworkId[foundNetworkId] = [fileContents];
    }
  }

  const normalizedArtifacts = [];
  for (let networkId of Object.keys(artifactsGroupedByNetworkId)) {
    // handle artifacts without deployments
    // networkId will be an undefined string not obj
    if (networkId === "undefined") {
      // typeof check?
      artifactsGroupedByNetworkId[networkId].forEach(item => {
        normalizedArtifacts.push(item);
      });
    } else {
      // convert network ids to blockchain uri
      const blockchainUri = await convertNetworkIdToBlockchainUri(
        networkId,
        options.ethpm.infuraKey
      );
      artifactsGroupedByNetworkId[networkId].forEach(item => {
        delete Object.assign(item.networks, {
          [blockchainUri]: item.networks[networkId],
        })[networkId];
        normalizedArtifacts.push(item);
      });
    }
  }
  const parsedArtifacts = parseTruffleArtifacts(normalizedArtifacts);
  const sources = await resolveSources(
    sourcePaths,
    options.contracts_directory,
    ethpm
  );
  console.log("resolved sources");
  console.log(sources);
  return {
    resolvedSources: sources,
    resolvedContractTypes: parsedArtifacts.contractTypes,
    resolvedDeployments: parsedArtifacts.deployments,
  };
}

//
// Utils
//

function validateSupportedChainId(chainId) {
  if (!(chainId in SUPPORTED_CHAIN_IDS)) {
    throw new TruffleError(
      `Detected chain ID: ${chainId} is not a supported chain id. Supported values include ${Object.keys(
        SUPPORTED_CHAIN_IDS
      )}`
    );
  }
}

function getInfuraEndpointForChainId(chainId, infuraKey) {
  validateSupportedChainId(chainId);
  return `https://${SUPPORTED_CHAIN_IDS[chainId]}.infura.io/v3/${infuraKey}`;
}

function fetchInstalledBuildDependencies(workingDirectory) {
  let ethpmLock;
  try {
    ethpmLock = JSON.parse(
      fs.readFileSync(
        path.join(workingDirectory, "_ethpm_packages", "ethpm.lock"),
        "utf8"
      )
    );
  } catch (err) {
    return {};
  }
  const installedBuildDependencies = {};
  Object.keys(ethpmLock).forEach(function (key, _) {
    installedBuildDependencies[key] = ethpmLock[key].resolved_uri;
  });
  return installedBuildDependencies;
}

//function convertContractTypeToContractSchema(
//contractData,
//contractDeployments
//) {
//return {
//...(contractData.abi && { abi: contractData.abi }),
//...(contractData.contractName && {
//contractName: contractData.contractName,
//}),
//...(contractData.compiler && {
//compiler: {
//...(contractData.compiler.name && {
//name: contractData.compiler.name,
//}),
//...(contractData.compiler.version && {
//version: contractData.compiler.version,
//}),
//},
//}),
//// idt these support linkrefs
//...(contractData.runtimeBytecode &&
//contractData.runtimeBytecode.bytecode && {
//deployedBytecode: contractData.runtimeBytecode.bytecode,
//}),
//...(contractData.deploymentBytecode &&
//contractData.deploymentBytecode.bytecode && {
//bytecode: contractData.deploymentBytecode.bytecode,
//}),
//...(contractDeployments && { networks: contractDeployments }),
//// source: sources?
//// contract-schema doesn't define devdoc/userdoc but artifacts have it - can we include?
//};
/*}*/

async function convertNetworkIdToBlockchainUri(networkId, infuraKey) {
  validateSupportedChainId(networkId);
  const infuraUri = getInfuraEndpointForChainId(networkId, infuraKey);
  const w3 = new Web3(new Web3.providers.HttpProvider(infuraUri));
  const genesisBlock = await w3.eth.getBlock(0);
  const latestBlock = await w3.eth.getBlock("latest");
  return `blockchain://${genesisBlock.hash.replace(
    "0x",
    ""
  )}/block/${latestBlock.hash.replace("0x", "")}`;
}

// handles sources installed via ethpm
async function resolveSources(sourcePaths, contractsDirectory, ethpm) {
  const sources = {};
  for (let sourcePath of Object.keys(sourcePaths)) {
    if (typeof sourcePath !== "undefined") {
      const ipfsHash = await ethpm.storage.write(sourcePaths[sourcePath]);
      // resolve all sources (including ethpm) to absolute contracts dir
      const absolute = path.resolve(contractsDirectory, sourcePath);
      // resolve all sources to relative path
      const resolved = path.relative(contractsDirectory, absolute);
      sources[resolved] = {
        // this can lose ./ prefix
        urls: [ipfsHash.href],
        type: "solidity",
        installPath: `./${resolved}`,
      };
    }
  }
  return sources;
}

module.exports = PackageV3;
