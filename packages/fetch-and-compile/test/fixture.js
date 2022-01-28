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

  "https://api-goerli.etherscan.com/api": {
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
    "0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398": {
      status: "1",
      message: "OK-Missing/Invalid API Key, rate limit of 1/5sec applied",
      result: [
        {
          SourceCode: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/polygon/0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398/GrowthVault.sol"
            ),
            "utf8"
          ),
          ABI: fs.readFileSync(
            path.resolve(
              __dirname,
              "./sources/etherscan/polygon/0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398/GrowthVault.abi.json"
            ),
            "utf8"
          ),
          ContractName: "GrowthVault",
          CompilerVersion: "v0.8.9+commit.e5eed63a",
          OptimizationUsed: "1",
          Runs: "200",
          ConstructorArguments:
            "000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001800000000000000000000000003324af8417844e70b81555a6d1568d78f4d4bf1f000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000010000000000000000000000001948abc5400aa1d72223882958da3bec643fb4e50000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000d3b71117e6c1558c1553305b44988cd944e97300000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff0000000000000000000000000000000000000000000000000000000000000007536861726520560000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025356000000000000000000000000000000000000000000000000000000000000",
          EVMVersion: "Default",
          Library: "",
          LicenseType: "MIT",
          Proxy: "0",
          Implementation: "",
          SwarmSource:
            "ipfs://4b803eff2b53da590615ae9571dfcb7a4fa564c5f1d196b7e24bac3dcf52f96d"
        }
      ]
    }
  }
};

const sourcifyFixture = {};

module.exports = { etherscanFixture, sourcifyFixture };
