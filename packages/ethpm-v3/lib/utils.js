const { EthpmURI } = require("ethpm/utils/uri");
const TruffleError = require("@truffle/error");
const { parseTruffleArtifacts } = require("ethpm/utils/truffle");
const Web3 = require("web3");
const { isAddress } = require("web3-utils");
const path = require("path");
const fs = require("fs");
const ENS = require("ethereum-ens");

const SUPPORTED_CHAIN_IDS = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  5: "goerli",
  42: "kovan"
};

const SUPPORTED_GENESIS_BLOCKS = {
  "d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3": 1,
  "41941023680923e0fe4d74a34bdac8141f2540e3ae90623718e47d66d1ca4a2d": 3,
  "6341fd3daf94b748c72ced5a5b26028f2474f5f00d824504e4fa37a75767e177": 4,
  "bf7e331f7f7c1dd2e05159666b3bf8bc7a8a3a9eb1d518969eab529dd9b88c1a": 5,
  "a3c565fc15c7478862d50ccd6561e3c06b24cc509bf388941c25ea985ce32cb9": 42
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
    const allDeploymentNetworkIds = Object.keys(fileContents.networks);
    allDeploymentNetworkIds.forEach(deploymentNetworkId => {
      if (artifactsGroupedByNetworkId.hasOwnProperty(deploymentNetworkId)) {
        artifactsGroupedByNetworkId[deploymentNetworkId].push(fileContents);
      } else {
        artifactsGroupedByNetworkId[deploymentNetworkId] = [fileContents];
      }
    });
  }

  const normalizedArtifacts = [];
  for (let networkId of Object.keys(artifactsGroupedByNetworkId)) {
    // handle artifacts without deployments
    // networkId will be an undefined string literal not raw undefined type
    if (networkId === "undefined") {
      artifactsGroupedByNetworkId[networkId].forEach(item => {
        normalizedArtifacts.push(item);
      });
    } else {
      // convert network ids to blockchain uri
      let targetProvider;
      for (let provider of Object.keys(options.networks)) {
        if (
          options.networks[provider].network_id == networkId &&
          options.networks[provider].provider
        ) {
          targetProvider = options.networks[provider].provider();
        }
      }

      if (!targetProvider) {
        throw new TruffleError(
          `Missing provider for network id: ${networkId}. Please make sure there is an available provider in your truffle-config`
        );
      }

      const blockchainUri = await getBlockchainUriForProvider(targetProvider);
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
    resolvedContractTypes: parsedArtifacts.contractTypes,
    resolvedDeployments: parsedArtifacts.deployments,
    resolvedCompilers: parsedArtifacts.compilers
  };
}

async function resolveEthpmUri(options, provider) {
  let targetRegistry;
  var targetProvider = provider;
  const ethpmUri = new EthpmURI(options.packageId);
  const w3 = new Web3(targetProvider);
  const connectedChainId = await w3.eth.net.getId();

  // update provider if it doesn't match chain id in ethpm uri
  if (
    connectedChainId != ethpmUri.chainId &&
    options.ethpm.registry.network != "development"
  ) {
    const targetNetwork = SUPPORTED_CHAIN_IDS[ethpmUri.chainId];
    if (typeof targetNetwork === "undefined") {
      throw new TruffleError(
        `Invalid ethpm uri. Unsupported chain id: ${ethpmUri.chainId}`
      );
    }
    targetProvider = options.networks[targetNetwork].provider();
  }

  // Resolve ENS names in ethpm uri
  if (!isAddress(ethpmUri.address)) {
    if (ethpmUri.chainId != 1) {
      throw new TruffleError(
        "Invalid ethPM uri. ethPM URIs must use an ENS name for registries located on mainnet."
      );
    }
    if (options.ens.enabled === false) {
      throw new TruffleError(
        "Invalid ethPM uri. ENS must be enabled in truffle-config to use ethPM uris with ENS names."
      );
    }
    try {
      var ens = new ENS(targetProvider);
      targetRegistry = await ens.resolver(ethpmUri.address).addr();
    } catch (err) {
      throw new TruffleError(
        `Unable to resolve ENS name: ${ethpmUri.address}. Reason: ${err.message}`
      );
    }
  } else {
    targetRegistry = ethpmUri.address;
  }

  if (!ethpmUri.packageName) {
    throw new TruffleError(
      "Invalid ethpm uri. To install from an ethpm uri, you must at least provide the package name to install."
    );
  }

  return {
    targetPackageName: ethpmUri.packageName,
    targetVersion: ethpmUri.version,
    targetNetworkId: ethpmUri.chainId,
    targetRegistry: targetRegistry,
    targetProvider: targetProvider
  };
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

function convertContractTypeToContractSchema(
  contractData,
  contractDeployments
) {
  return {
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
}

async function getBlockchainUriForProvider(provider) {
  const w3 = new Web3(provider);
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
    // sourcePath is an "undefined" string literal here not raw undefined type
    if (sourcePath != "undefined") {
      const ipfsUri = await ethpm.storage.write(sourcePaths[sourcePath]);
      // resolve all sources (including ethpm) to absolute contracts dir
      const absolute = path.resolve(contractsDirectory, sourcePath);
      // resolve all sources to relative path
      const resolved = path.relative(contractsDirectory, absolute);
      sources[resolved] = {
        // this can lose ./ prefix
        urls: [ipfsUri.href],
        type: "solidity",
        installPath: `./${resolved}`
      };
    }
  }
  return sources;
}

// Get provider from config (and handles ganache provider from tests)
function pluckProviderFromConfig(config) {
  const targetNetwork = config.ethpm.registry.network;
  if (config.networks[targetNetwork].provider.constructor.name == "Function") {
    return config.networks[targetNetwork].provider();
  } else {
    return config.networks[targetNetwork].provider;
  }
}

module.exports = {
  getPublishableArtifacts,
  resolveEthpmUri,
  convertContractTypeToContractSchema,
  fetchInstalledBuildDependencies,
  pluckProviderFromConfig,
  SUPPORTED_CHAIN_IDS,
  SUPPORTED_GENESIS_BLOCKS
};
