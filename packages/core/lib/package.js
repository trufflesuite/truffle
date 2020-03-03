const expect = require("@truffle/expect");
const Artifactor = require("@truffle/artifactor");
const TruffleError = require("@truffle/error");
const Contracts = require("@truffle/workflow-compile");
const { EthPM } = require("ethpm");
const { EthpmURI } = require("ethpm/utils/uri");
const { parseTruffleArtifacts } = require("ethpm/utils/truffle");
const Web3 = require("web3");
const path = require("path");
const fs = require("fs");

SUPPORTED_CHAIN_IDS = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  5: "goerli",
  42: "kovan"
};

// checksummed / 0x prefix?
SUPPORTED_GENESIS_BLOCKS = {
  "d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3": 1,
  "41941023680923e0fe4d74a34bdac8141f2540e3ae90623718e47d66d1ca4a2d": 3,
  "6341fd3daf94b748c72ced5a5b26028f2474f5f00d824504e4fa37a75767e177": 4,
  "bf7e331f7f7c1dd2e05159666b3bf8bc7a8a3a9eb1d518969eab529dd9b88c1a": 5,
  "a3c565fc15c7478862d50ccd6561e3c06b24cc509bf388941c25ea985ce32cb9": 42
};

// why do i have to manually install hdwallet provider
const Package = {
  install: async (options, done) => {
    // ethpm_uri - shouldn't be part of options.ethpm since its the cli arg
    try {
      expect.options(options, [
        "ethpm",
        "ethpm_uri",
        "logger",
        "working_directory",
        "contracts_build_directory"
      ]);
      expect.options(options.ethpm, [
        "ipfs_host",
        "ipfs_port",
        "ipfs_protocol",
        "infura_key"
      ]);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    // ethpm.js
    // validate checksum address or ens name
    // support ens names in ethpm uri
    // pkg already install warning
    // validate registry URI and provider match

    // Parse ethpm uri
    let ethpmUri;
    try {
      ethpmUri = new EthpmURI(options.ethpm_uri);
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

    // Create a web3 instance connected to a blockchain
    const infuraUri = getInfuraEndpointForChainId(
      ethpmUri.chainId,
      options.ethpm.infura_key
    );
    const provider = new Web3.providers.HttpProvider(infuraUri, {
      keepAlive: true
    }); // do we need/want keepAlive?

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
          host: options.ethpm.ipfs_host,
          port: options.ethpm.ipfs_port,
          protocol: options.ethpm.ipfs_protocol
        }
      });
    } catch (err) {
      done(new TruffleError(`Invalid config: ${err.message}`));
    }

    // Validate target package is available on connected registry
    const availablePackages = await ethpm.registries.packages();
    if (!availablePackages.includes(ethpmUri.packageName)) {
      done(
        new TruffleError(
          "Package: " +
            ethpmUri.packageName +
            ", not found on registry at address: " +
            ethpmUri.address +
            ". Available packages include: " +
            availablePackages
        )
      );
    }

    // Fetch target package manifest URI
    const manifestUri = await ethpm.registries
      .package(ethpmUri.packageName)
      .release(ethpmUri.version);

    // Install target manifest URI to working directory
    await ethpm.installer.install(manifestUri, ethpmUri.address);
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

    // w/ blockchainUri => network id
    const normalizedDeployments = {};

    if (ethpmPackage.deployments) {
      ethpmPackage.deployments.forEach((value, key, _) => {
        if (!(key.host in SUPPORTED_GENESIS_BLOCKS)) {
          console.log("only support deployments on 5 chains");
        }
        normalizedDeployments[SUPPORTED_GENESIS_BLOCKS[key.host]] = value;
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
        abi: contractData.abi,
        contractName: contractData.contractName,
        compiler: {
          name: contractData.compiler.name,
          version: contractData.compiler.version
        }
        //networks: contractDeployments,
        //bytecode: contractData.deploymentBytecode,
        //deployedBytecode: contractData.runtimeBytecode,
        //test: contractData.test
        // prob
        // contractName: contractData.contractName,
        // source: sources?
        // no natspec - just devdoc/userdoc
        // how to only include a field if defined?
      };
      // validate against actual contract schema
      await artifactor.save(validContractSchema);
    }
    options.logger.log("done storing artifacts");
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
        "ipfs_host",
        "ipfs_port",
        "ipfs_protocol",
        "registry",
        "infura_key"
      ]);
    } catch (err) {
      done(new TruffleError(err.message));
    }

    // validate is setup with mnemonic?
    // validate mnemonic has publishing rights for options.registry?

    const registryURI = new EthpmURI(options.ethpm.registry);
    const registryProviderURI = getInfuraEndpointForChainId(
      registryURI.chainId,
      options.ethpm.infura_key
    );
    const registryProvider = new Web3.providers.HttpProvider(
      registryProviderURI,
      { keepAlive: true }
    ); // do we need/want keepAlive?
    const seededProvider = options.networks.ropsten.provider();
    registryProvider; // bad - what to do about provider

    let ethpm = await EthPM.configure({
      manifests: "ethpm/manifests/v2",
      storage: "ethpm/storage/ipfs",
      registries: "ethpm/registries/web3"
    }).connect({
      provider: seededProvider, // bad hardcoded provider
      registryAddress: registryURI.address,
      ipfs: {
        host: options.ethpm.ipfs_host,
        port: options.ethpm.ipfs_port,
        protocol: options.ethpm.ipfs_protocol
      }
    });

    let artifacts = await getPublishableArtifacts(options, ethpm);
    console.log("made artifacts");

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
        throw new TruffleError(
          "Invalid ethpm.json: Must contain a 'package_name' and 'version'."
        );
      }
    } catch (e) {
      throw new TruffleError("Invalid ethpm.json configuration detected.");
    }
    console.log("made ethpm config");

    const ethpmFields = {
      sources: artifacts.resolvedSources,
      contract_types: artifacts.resolvedContractTypes,
      deployments: artifacts.resolvedDeployments,
      build_dependencies: {}
    };

    const targetConfig = Object.assign(ethpmFields, ethpmConfig);
    const pkg = await ethpm.manifests.read(JSON.stringify(targetConfig));
    const manifest = await ethpm.manifests.write(pkg);
    const manifestURI = await ethpm.storage.write(manifest);

    console.log(`made manifest uri: ${manifestURI.href}`);
    console.log(`releasing package to ${options.ethpm.registry}`);
    await ethpm.registries.registry.methods
      .release(ethpmConfig.package_name, ethpmConfig.version, manifestURI.href)
      .send({
        from: seededProvider.addresses[0], // this is bad hardcoded account
        gas: 4712388,
        gasPrice: 100000000000
      });
    options.logger.log(
      `Released ${ethpmConfig.package_name}@${
        ethpmConfig.version
      } to registry @ ${options.ethpm.registry}`
    );
    //return JSON.parse(manifest); // remove this
  }
};

function validateSupportedChainId(chainId) {
  if (!(chainId in SUPPORTED_CHAIN_IDS)) {
    throw new TruffleError("xxx");
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
    var msg =
      "Could not locate any publishable artifacts in " +
      options.contracts_build_directory +
      ". " +
      "Run `truffle compile` before publishing.";

    return new Error(msg);
  }

  const fileData = [];
  const normData = {};
  const sourcePaths = {};
  // group by network id to handle deployments
  for (let file of files) {
    const fileContents = JSON.parse(
      fs.readFileSync(
        path.join(options.contracts_build_directory, file),
        "utf8"
      )
    );
    sourcePaths[fileContents.sourcePath] = fileContents.source;
    const foundNetworkId = Object.keys(fileContents.networks)[0];
    if (foundNetworkId in normData) {
      normData[foundNetworkId].push(fileContents);
    } else {
      normData[foundNetworkId] = [fileContents];
    }
  }
  // convert network ids to blockchain uri
  for (let networkId of Object.keys(normData)) {
    // handle artifacts without deployments
    if (networkId == "undefined") {
      normData[networkId].forEach(item => {
        fileData.push(item);
      });
    } else {
      const blockchainUri = await convertNetworkIdToBlockchainUri(
        networkId,
        options.ethpm.infura_key
      );
      normData[networkId].forEach(item => {
        delete Object.assign(item.networks, {
          [blockchainUri]: item.networks[networkId]
        })[networkId];
        fileData.push(item);
      });
    }
  }
  const parsedArtifacts = parseTruffleArtifacts(fileData);
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
  for (let sourcePath of Object.keys(sourcePaths)) {
    const ipfsHash = await ethpm.storage.write(sourcePaths[sourcePath]);
    // resolve all sources (including ethpm) to absolute contracts dir
    const absolute = path.resolve(contractsDirectory, sourcePath);
    // resolve all sources to relative path
    const resolved = path.relative(contractsDirectory, absolute);
    sources[`./${resolved}`] = ipfsHash.href;
  }
  return sources;
}

module.exports = Package;
