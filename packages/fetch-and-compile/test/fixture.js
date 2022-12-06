const fs = require("fs");
const path = require("path");

const etherscanFixture = {
  "https://api.etherscan.io/api": {
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": {
      status: "1",
      message: "OK-Missing/Invalid API Key, rate limit of 1/5sec applied",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mainnet/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D/UniswapV2Router02.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mainnet/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D/UniswapV2Router02.abi.json"
            ),
            "utf8"
          ),
          ContractName: "UniswapV2Router02",
          CompilerVersion: "v0.6.6+commit.6c089d02",
          OptimizationUsed: "1",
          Runs: "999999",
          ConstructorArguments:
            "0000000000000000000000005c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          EVMVersion: "istanbul",
          Library: "",
          LicenseType: "GNU GPLv3",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://6dd6e03c4b2c0a8e55214926227ae9e2d6f9fec2ce74a6446d615afa355c84f3"
        }
      ]
    },
    "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e": {
      status: "1",
      message: "OK-Missing/Invalid API Key, rate limit of 1/5sec applied",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mainnet/0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e/ENSRegistryWithFallback.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mainnet/0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e/ENSRegistryWithFallback.abi.json"
            ),
            "utf8"
          ),
          ContractName: "ENSRegistryWithFallback",
          CompilerVersion: "v0.5.16+commit.9c3226ce",
          OptimizationUsed: "0",
          Runs: "200",
          ConstructorArguments:
            "000000000000000000000000314159265dd8dbb310642f98f50c066173c1259b",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "None",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "bzzr://e307c1741e952c90d504ae303fa3fa1e5f6265200c65304d90abaa909d2dee4b"
        }
      ]
    },
    "0x60BB16c4A931b1a0B8A7D945C651DD90f41D42Cf": {
      status: "1",
      message: "OK-Missing/Invalid API Key, rate limit of 1/5sec applied",
      result: [
        {
          SourceCode: JSON.stringify(
            Object.fromEntries(
              [
                "Address.sol",
                "Context.sol",
                "ERC20.sol",
                "IERC20.sol",
                "Ownable.sol",
                "SafeMath.sol"
              ].map(sourceName => [
                sourceName,
                {
                  content: fs.readFileSync(
                    path.resolve(
                      __dirname,
                      `./sources/etherscan/mainnet/0x60BB16c4A931b1a0B8A7D945C651DD90f41D42Cf/${sourceName}`
                    ),
                    "utf8"
                  )
                }
              ])
            )
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mainnet/0x60BB16c4A931b1a0B8A7D945C651DD90f41D42Cf/ERC20.abi.json"
            ),
            "utf8"
          ),
          ContractName: "ERC20",
          CompilerVersion: "v0.6.12+commit.27d51765",
          OptimizationUsed: "0",
          Runs: "200",
          ConstructorArguments:
            "00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000d46696e616e6365426c6f636b730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034642580000000000000000000000000000000000000000000000000000000000",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "MIT",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://d6d4801f9ee5ce4b5e274aa314f55666a990157e9d1d8c603b29a56275ea9b73"
        }
      ]
    },
    "0xede17dF1a202Ca498a822151079648aCa96e2633": {
      status: "1",
      message: "OK-Missing/Invalid API Key, rate limit of 1/5sec applied",
      result: [
        {
          //note the extra braces here; Etherscan indicates JSON format
          //(as opposed to multi-source format) by putting an extra pair
          //of braces around the JSON
          SourceCode: `{${fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mainnet/0xede17dF1a202Ca498a822151079648aCa96e2633/L1StandardBridge.json"
            ),
            "utf8"
          )}}`,
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mainnet/0xede17dF1a202Ca498a822151079648aCa96e2633/L1StandardBridge.abi.json"
            ),
            "utf8"
          ),
          ContractName: "L1StandardBridge",
          CompilerVersion: "v0.8.9+commit.e5eed63a",
          OptimizationUsed: "1",
          Runs: "10000",
          ConstructorArguments: "",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "",
          Proxy: "0",
          Implementation: "",
          SwarmSource: ""
        }
      ]
    }
  },

  "https://api-goerli.etherscan.io/api": {
    "0xeBC990735Aafd169415D675B6e90aB901f8BDae1": {
      status: "1",
      message: "OK-Missing/Invalid API Key, rate limit of 1/5sec applied",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/goerli/0xeBC990735Aafd169415D675B6e90aB901f8BDae1/ExternalTestSingle.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/goerli/0xeBC990735Aafd169415D675B6e90aB901f8BDae1/ExternalTestSingle.abi.json"
            ),
            "utf8"
          ),
          ContractName: "ExternalTestSingle",
          CompilerVersion: "v0.6.8+commit.0bbfe453",
          OptimizationUsed: "0",
          Runs: "200",
          ConstructorArguments: "",
          EVMVersion: "Default",
          Library:
            "ExternalTestLibrarySingle:1d882c678b9b135bc2c685d131d26423c33451ce",
          LicenseType: "MIT",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://8c97e23b847357ddeeb8c13acce8281b2c4e92cebecbc0176500e8fc2715a143"
        }
      ]
    }
  },

  "https://api-optimistic.etherscan.io/api": {
    "0xca5f37e6D8bB24c5A7958d5eccE7Bd9Aacc944f2": {
      status: "1",
      message: "OK",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/optimistic/0xca5f37e6D8bB24c5A7958d5eccE7Bd9Aacc944f2/InstaERC20Resolver.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/optimistic/0xca5f37e6D8bB24c5A7958d5eccE7Bd9Aacc944f2/InstaERC20Resolver.abi.json"
            ),
            "utf8"
          ),
          ContractName: "InstaERC20Resolver",
          CompilerVersion: "v0.8.7+commit.e28d00a7",
          OptimizationUsed: "1",
          Runs: "200",
          ConstructorArguments: "",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "MIT",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://1f1271e6fab35e49f32af4c24bf0c6b4f99409e4793f7c3c45b9a2d453adb651"
        }
      ]
    }
  },

  "https://api-kovan-optimistic.etherscan.io/api": {
    "0x5bb6699ef885ca997d1467380ff9e51c606a07e1": {
      status: "1",
      message: "OK",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/kovan-optimistic/0x5bb6699ef885ca997d1467380ff9e51c606a07e1/Wormhole.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/kovan-optimistic/0x5bb6699ef885ca997d1467380ff9e51c606a07e1/Wormhole.abi.json"
            ),
            "utf8"
          ),
          ContractName: "Wormhole",
          CompilerVersion: "v0.8.6+commit.11564f7e",
          OptimizationUsed: "0",
          Runs: "200",
          ConstructorArguments: "",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "None",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://10357a4f7b671c8a5b0c870cd2bda25dd017773e274f0cfa416461963ac82b5b"
        }
      ]
    }
  },

  "https://api.arbiscan.io/api": {
    "0x2B52D1B2b359eA39536069D8c6f2a3CFE3a09c31": {
      status: "1",
      message: "OK",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/arbitrum/0x2B52D1B2b359eA39536069D8c6f2a3CFE3a09c31/Storage.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/arbitrum/0x2B52D1B2b359eA39536069D8c6f2a3CFE3a09c31/Storage.abi.json"
            ),
            "utf8"
          ),
          ContractName: "Storage",
          CompilerVersion: "v0.8.4+commit.c7e474f2",
          OptimizationUsed: "1",
          Runs: "1000",
          ConstructorArguments:
            "0000000000000000000000009f20de1fc9b161b34089cbeae888168b44b03461",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "",
          Proxy: "0",
          Implementation: "",
          SwarmSource: ""
        }
      ]
    }
  },

  "https://api.polygonscan.com/api": {
    "0xCF79C5417934ECde6BA055C0119A03380CE28DEC": {
      status: "1",
      message: "OK-Missing/Invalid API Key, rate limit of 1/5sec applied",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/polygon/0xCF79C5417934ECde6BA055C0119A03380CE28DEC/Auction.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/polygon/0xCF79C5417934ECde6BA055C0119A03380CE28DEC/Auction.abi.json"
            ),
            "utf8"
          ),
          ContractName: "Auction",
          CompilerVersion: "v0.8.7+commit.e28d00a7",
          OptimizationUsed: "1",
          Runs: "200",
          ConstructorArguments:
            "0000000000000000000000000724b4e1b19beafdbc812597fdac138d26d79d9800000000000000000000000000000000000000000000028a857425466f80000000000000000000000000000000000000000000000000000000000000620499780000000000000000000000000000000000000000000000000000000063e5ccf8000000000000000000000000d1c62e55a3c274ecefbcb0d522e9017bca4cc01d0000000000000000000000008f3cf7ad23cd3cadbd9735aff958023239c6a063",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "MIT",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://cc0fe5df363f7f4671fe4c2db896c5aeaabdedae40ece2a528e19fbeefeb4ae5"
        }
      ]
    }
  },

  "https://api-mumbai.polygonscan.com/api": {
    "0xF618d6deB4C4F24776810ec3221dFe211b979B4F": {
      status: "1",
      message: "OK",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mumbai-polygon/0xF618d6deB4C4F24776810ec3221dFe211b979B4F/HelloWorld.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/mumbai-polygon/0xF618d6deB4C4F24776810ec3221dFe211b979B4F/HelloWorld.abi.json"
            ),
            "utf8"
          ),
          ContractName: "HelloWorld",
          CompilerVersion: "v0.5.17+commit.d19bba13",
          OptimizationUsed: "0",
          Runs: "200",
          ConstructorArguments:
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "None",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "bzzr://1c2edbbd9b16fdf30f6f5c6a3283cfa4218b70a6356271f51f2f42435dc44c13"
        }
      ]
    }
  },

  "https://api-moonbeam.moonscan.io/api": {
    "0x23eA13c920aF82353872E36CaE99797fb28a8981": {
      status: "1",
      message: "OK",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/moonbeam/0x23eA13c920aF82353872E36CaE99797fb28a8981/TimelockController.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/moonbeam/0x23eA13c920aF82353872E36CaE99797fb28a8981/TimelockController.abi.json"
            ),
            "utf8"
          ),
          ContractName: "TimelockController",
          CompilerVersion: "v0.8.4+commit.c7e474f2",
          OptimizationUsed: "1",
          Runs: "200",
          ConstructorArguments:
            "0000000000000000000000000000000000000000000000000000000000015180000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000058d7b4e82cdadc74f67171df2bc58469d0bccbd600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "MIT",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://8b8e113cfe3540e9f4cbd02b3c535389ad2de63823ae6343d24ef88049e060da"
        }
      ]
    }
  },

  "https://api-moonriver.moonscan.io/api": {
    "0x56f4ca4f9dbb29c9438d9de48bd07f4b7fa765a3": {
      status: "1",
      message: "OK",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/moonriver/0x56f4ca4f9dbb29c9438d9de48bd07f4b7fa765a3/ERC1967Proxy.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/moonriver/0x56f4ca4f9dbb29c9438d9de48bd07f4b7fa765a3/ERC1967Proxy.abi.json"
            ),
            "utf8"
          ),
          ContractName: "ERC1967Proxy",
          CompilerVersion: "v0.8.2+commit.661d1103",
          OptimizationUsed: "1",
          Runs: "200",
          ConstructorArguments:
            "00000000000000000000000052488cc42047426ca51eaf645d9d6538fce3792e000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a4f399e22e000000000000000000000000489b02d20166548d4e01a37d6c0fafd31f30167e0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002b68747470733a2f2f6d6574612e646567656e657261746976652d6172742e78797a2f6d6574612f686f732f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "MIT",
          Proxy: "1",
          Implementation: "0x52488cc42047426ca51eaf645d9d6538fce3792e",
          SwarmSource:
            "ipfs://9b8470f06e8a3960c912103fc2be177edaad69584ee3c7d2809ee737e79408e7"
        }
      ]
    }
  },

  "https://api-moonbase.moonscan.io/api": {
    "0xf85544ea3dd634ebe9a61d963295b054adb0c803": {
      status: "1",
      message: "OK",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/moonbase-alpha/0xf85544ea3dd634ebe9a61d963295b054adb0c803/AddressStore.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/moonbase-alpha/0xf85544ea3dd634ebe9a61d963295b054adb0c803/AddressStore.abi.json"
            ),
            "utf8"
          ),
          ContractName: "AddressStore",
          CompilerVersion: "v0.4.26+commit.4563c3fc",
          OptimizationUsed: "1",
          Runs: "200",
          ConstructorArguments: "",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "None",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "bzzr://dc0d874686578a1ffffb9e492d205fd85d85b63c195c40b1ab0193ca5e1c50c4"
        }
      ]
    }
  }
};

const sourcifyFixture = {};

module.exports = { etherscanFixture, sourcifyFixture };
