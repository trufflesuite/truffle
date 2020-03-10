const expect = require("@truffle/expect");
const Artifactor = require("@truffle/artifactor");
const TruffleError = require("@truffle/error");
const Contracts = require("@truffle/workflow-compile");
const { EthPM } = require("ethpm");
const { EthpmURI } = require("ethpm/utils/uri");
const { parseTruffleArtifacts } = require("ethpm/utils/truffle");
const Web3 = require("web3");
const { isAddress } = require("web3-utils");
const path = require("path");
const fs = require("fs");
const ENSJS = require("ethereum-ens");
const TruffleContractSchema = require("@truffle/contract-schema");

SUPPORTED_CHAIN_IDS = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  5: "goerli",
  42: "kovan"
};

SUPPORTED_GENESIS_BLOCKS = {
  "d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3": 1,
  "41941023680923e0fe4d74a34bdac8141f2540e3ae90623718e47d66d1ca4a2d": 3,
  "6341fd3daf94b748c72ced5a5b26028f2474f5f00d824504e4fa37a75767e177": 4,
  "bf7e331f7f7c1dd2e05159666b3bf8bc7a8a3a9eb1d518969eab529dd9b88c1a": 5,
  "a3c565fc15c7478862d50ccd6561e3c06b24cc509bf388941c25ea985ce32cb9": 42
};

const Package = {
  install: async (options, done) => {
    try {
      expect.options(options, [
        "ethpm", // default ethpm settings
        "ethpmUri", // target uri to install
        "logger",
        "working_directory",
        "contracts_build_directory"
      ]);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "infuraKey"
      ]);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    // Parse ethpm uri
    options.logger.log("Fetching package manifest...");
    let ethpmUri;
    try {
      ethpmUri = new EthpmURI(options.ethpmUri);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    if (!ethpmUri.packageName && !ethpmUri.version) {
      done(
        new TruffleError(
          "Invalid ethPM uri. URIs must specify a package name and version to install."
        )
      );
    }

    // Create a web3 instance connected to the ethpm uri's registry blockchain
    const infuraUri = getInfuraEndpointForChainId(
      ethpmUri.chainId,
      options.ethpm.infuraKey
    );
    const provider = new Web3.providers.HttpProvider(infuraUri, {
      keepAlive: true
    });

    // Resolve ENS names in ethpm uri
    if (!isAddress(ethpmUri.address)) {
      if (ethpmUri.chainId !== 1) {
        done(
          new TruffleError(
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
        const ensjs = new ENSJS(provider, options.ens.registry.address);
        ethpmUri.address = await ensjs.resolver(ethpmUri.address).addr();
      } catch (err) {
        done(new TruffleError(`Unable to resolve uri: ${err.message}`));
      }
    }

    // Create an ethpm instance
    let ethpm;
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v2",
        registries: "ethpm/registries/web3",
        installer: "ethpm/installer/truffle",
        storage: "ethpm/storage/ipfs"
      }).connect({
        provider: provider,
        workingDirectory: options.working_directory,
        registryAddress: ethpmUri.address,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol
        }
      });
    } catch (err) {
      done(new TruffleError(`Unable to configure ethPM: ${err.message}`));
    }

    // Validate target package is available on connected registry
    const availablePackages = await ethpm.registries.packages();
    if (!availablePackages.includes(ethpmUri.packageName)) {
      done(
        new TruffleError(
          `Package: ${
            ethpmUri.packageName
          }, not found on registry at address: ${
            ethpmUri.address
          }. Available packages include: ${availablePackages}`
        )
      );
    }

    // Fetch target package manifest URI
    const manifestUri = await ethpm.registries
      .package(ethpmUri.packageName)
      .release(ethpmUri.version);

    // Install target manifest URI to working directory
    try {
      await ethpm.installer.install(manifestUri, ethpmUri.address);
    } catch (err) {
      done(new TruffleError(`Install error: ${err.message}`));
    }
    options.logger.log(
      `Installed ${ethpmUri.packageName}@${ethpmUri.version} to ${
        options.working_directory
      }`
    );

    // Add contract types and deployments to artifactor
    const manifest = await ethpm.storage.read(manifestUri);
    const ethpmPackage = await ethpm.manifests.read(manifest.toString());

    // compilation / build dir needs to happen before saving artifacts!
    await Contracts.compile(options.with({ all: true, quiet: true }));
    const artifactor = new Artifactor(options.contracts_build_directory);

    // convert blockchainUri => network id
    const normalizedDeployments = {};

    if (ethpmPackage.deployments) {
      ethpmPackage.deployments.forEach((value, key, _) => {
        const foundGenesisBlock = key.host.toLowerCase();
        if (!(foundGenesisBlock in SUPPORTED_GENESIS_BLOCKS)) {
          done(
            new TruffleError(
              `Blockchain uri detected with unsupported genesis block: ${foundGenesisBlock}`
            )
          );
        }
        normalizedDeployments[
          SUPPORTED_GENESIS_BLOCKS[foundGenesisBlock]
        ] = value;
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
      // WORKS BUT HAS INCORRECT PROVIDER?
      const validContractSchema = {
        ...(contractData.abi && { abi: contractData.abi }),
        ...(contractData.contractName && {
          contractName: contractData.contractName
        }),
        ...(contractData.compiler && {
          compiler: {
            ...(contractData.compiler.name && {
              name: contractData.compiler.name
            }),
            ...(contractData.compiler.version && {
              version: contractData.compiler.version
            })
          }
        }),
        // idt these support linkrefs
        ...(contractData.runtimeBytecode &&
          contractData.runtimeBytecode.bytecode && {
            deployedBytecode: contractData.runtimeBytecode.bytecode
          }),
        ...(contractData.deploymentBytecode &&
          contractData.deploymentBytecode.bytecode && {
            bytecode: contractData.deploymentBytecode.bytecode
          }),
        ...(contractDeployments && { networks: contractDeployments })
        // source: sources?
        // contract-schema doesn't define devdoc/userdoc but artifacts have it - can we include?
      };
      // seems like abi validation is too strict / outdated?
      try {
        await TruffleContractSchema.validate(validContractSchema);
      } catch (err) {
        done(new TruffleError(`ethPM package import error: ${err.message}`));
      }
      await artifactor.save(validContractSchema);
    }
    options.logger.log("Saved artifacts.");
    done();
  },

  publish: async (options, done) => {
    try {
      expect.options(options, [
        "contracts_build_directory",
        "contracts_directory",
        "ethpm",
        "logger",
        "network",
        "networks",
        "working_directory"
      ]);
      expect.options(options.ethpm, [
        "ipfsHost",
        "ipfsPort",
        "ipfsProtocol",
        "registry",
        "infuraKey"
      ]);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    const registryURI = new EthpmURI(options.ethpm.registry);
    const registryProviderURI = getInfuraEndpointForChainId(
      registryURI.chainId,
      options.ethpm.infuraKey
    );
    registryProvider = new Web3.providers.HttpProvider(registryProviderURI, {
      keepAlive: true
    });

    options.logger.log("Gathering contracts..."); // incorrect place
    let ethpm;
    try {
      ethpm = await EthPM.configure({
        manifests: "ethpm/manifests/v2",
        storage: "ethpm/storage/ipfs",
        registries: "ethpm/registries/web3"
      }).connect({
        provider: registryProvider, // bad hardcoded provider
        registryAddress: registryURI.address,
        ipfs: {
          host: options.ethpm.ipfsHost,
          port: options.ethpm.ipfsPort,
          protocol: options.ethpm.ipfsProtocol
        }
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
        ethpmConfig.packageName === "undefined" ||
        ethpmConfig.version === "undefined"
      ) {
        done(
          new TruffleError(
            "Invalid ethpm.json: Must contain a 'packageName' and 'version'."
          )
        );
      }
    } catch (err) {
      done(new TruffleError("Invalid ethpm.json configuration detected."));
    }

    const ethpmFields = {
      sources: artifacts.resolvedSources,
      contract_types: artifacts.resolvedContractTypes,
      deployments: artifacts.resolvedDeployments,
      build_dependencies: {}
    };

    options.logger.log(`Generating package manifest...`);
    const targetConfig = Object.assign(ethpmFields, ethpmConfig);
    const pkg = await ethpm.manifests.read(JSON.stringify(targetConfig));
    const manifest = await ethpm.manifests.write(pkg);
    const manifestURI = await ethpm.storage.write(manifest);

    options.logger.log(`Publishing package to ${options.ethpm.registry}`);
    try {
      const w3 = new Web3(options.provider);
      const encoded = ethpm.registries.registry.methods
        .release(ethpmConfig.packageName, ethpmConfig.version, manifestURI.href)
        .encodeABI();
      const tx = await w3.eth.signTransaction({
        from: options.provider.addresses[0],
        to: registryURI.address,
        gas: 4712388,
        gasPrice: 100000000000,
        data: encoded
      });
      await w3.eth.sendSignedTransaction(tx.raw);
    } catch (err) {
      done(new TruffleError(`Error publishing package: ${err}`));
    }
    done(
      options.logger.log(
        `Published ${ethpmConfig.packageName}@${
          ethpmConfig.version
        } to registry @ ${options.ethpm.registry}` // add link to explorer?
      )
    );
    //return JSON.parse(manifest); // remove this
  }
};

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

async function convertNetworkIdToBlockchainUri(networkId, infuraKey) {
  // mock value for ganache dev chains
  if (networkId > 100) {
    return "blockchain://329ff0a289d0ffba148c495b9cffd078d2f5a272538616b1b412c75f268134a4/block/46ef23590d0c99840621ac95b503ed569f79c65be452acd50478bfe721205ce1";
  }
  validateSupportedChainId(networkId); // chain id vs network id
  const infuraUri = getInfuraEndpointForChainId(networkId, infuraKey);
  const w3 = new Web3(new Web3.providers.HttpProvider(infuraUri));
  const genesisBlock = await w3.eth.getBlock(0);
  const latestBlock = await w3.eth.getBlock("latest");
  return `blockchain://${genesisBlock.hash.replace(
    "0x",
    ""
  )}/block/${latestBlock.hash.replace("0x", "")}`;
}

// Returns a list of publishable artifacts
// aka contract_types and deployments found in all artifacts
async function getPublishableArtifacts(options, ethpm) {
  var files = fs.readdirSync(options.contracts_build_directory);
  files = files.filter(file => file.includes(".json"));

  if (!files.length) {
    var msg = `Could not locate any publishable artifacts in ${
      options.contracts_build_directory
    }. Run "truffle compile" before publishing.`;
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
          [blockchainUri]: item.networks[networkId]
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
  return {
    resolvedSources: sources,
    resolvedContractTypes: parsedArtifacts.contract_types,
    resolvedDeployments: parsedArtifacts.deployments
  };
}

// handles sources installed via ethpm
async function resolveSources(sourcePaths, contractsDirectory, ethpm) {
  const sources = {};
  // TODO! how do we include installed pkgs in the publishing process?
  // just add as build dependencies? probably
  // flatten and include in pkg? probably not
  for (let sourcePath of Object.keys(sourcePaths)) {
    if (sourcePath !== "undefined") {
      const ipfsHash = await ethpm.storage.write(sourcePaths[sourcePath]);
      // resolve all sources (including ethpm) to absolute contracts dir
      const absolute = path.resolve(contractsDirectory, sourcePath);
      // resolve all sources to relative path
      const resolved = path.relative(contractsDirectory, absolute);
      sources[`./${resolved}`] = ipfsHash.href;
    }
  }
  return sources;
}

module.exports = Package;
