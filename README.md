# truffle-hdwallet-provider
HD Wallet-enabled Web3 provider. Use it to sign transactions for addresses derived from a 12-word mnemonic.

## Install

```
$ npm install truffle-hdwallet-provider
```

## General Usage

You can use this provider wherever a Web3 provider is needed, not just in Truffle. For Truffle-specific usage, see next section.

```javascript
var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "opinion destroy betray ..."; // 12 word mnemonic
var provider = new HDWalletProvider(mnemonic, "http://localhost:8545");

// Or, alternatively pass in a zero-based address index.
var provider = new HDWalletProvider(mnemonic, "http://localhost:8545", 5);
```

By default, the `HDWalletProvider` will use the address of the first address that's generated from the mnemonic. If you pass in a specific index, it'll use that address instead.

Parameters:

- `mnemonic`: `string`. 12 word mnemonic which addresses are created from.
- `provider_uri`: `string`. URI of Ethereum client to send all other non-transaction-related Web3 requests.
- `address_index`: `number`, optional. If specified, will tell the provider to manage the address or addresses starting at the index specified. Defaults to the first address (index `0`).
- `num_addresses`: `number`, optional. If specified, will tell the provider to manage the specified number of addresses. Defaults to `1`.

### Private Keys

Instead of a mnemonic, you can alternatively provide a private key or array of private keys as the first parameter. When providing an array, `address_index` and `num_addresses` are fully supported.

```javascript
var HDWalletProvider = require("truffle-hdwallet-provider");
//load single private key as string
var provider = new HDWalletProvider("3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580", "http://localhost:8545");

// Or, pass an array of private keys, and optionally use a certain subset of addresses
var privateKeys = [
  '3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580',
  '9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290',
];
var provider = new HDWalletProvider(privateKeys, "http://localhost:8545", 0, 2); //start at address_index 0 and load both addresses
```
**NOTE: This is just an example. NEVER hard code production/mainnet private keys in your code or commit them to git. They should always be loaded from environment variables or a secure secret management system.**
## Truffle Usage

You can easily use this within a Truffle configuration. For instance:

truffle.js
```javascript
var HDWalletProvider = require("truffle-hdwallet-provider");

var mnemonic = "opinion destroy betray ...";

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: new HDWalletProvider(mnemonic, "https://ropsten.infura.io/"),
      network_id: 3
    }
  }
};
```
