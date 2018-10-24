# truffle-hdwallet-provider
HD Wallet-enabled Web3 provider. Use it to sign transactions for addresses derived from a 12 or 24 word mnemonic.

## Install

```
$ npm install truffle-hdwallet-provider
```

## Requirements
```
Node >= 7.6
```

## General Usage

You can use this provider wherever a Web3 provider is needed, not just in Truffle. For Truffle-specific usage, see next section.

```javascript
var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "mountains supernatural bird..."; // 12 word mnemonic
var provider = new HDWalletProvider(mnemonic, "http://localhost:8545");

// Or, alternatively pass in a zero-based address index.
var provider = new HDWalletProvider(mnemonic, "http://localhost:8545", 5);

// Or, use your own hierarchical derivation path
var provider = new HDWalletProvider(mnemonic, "http://localhost:8545", 5, 1, "m/44'/137'/0'/0/");

// ...
// Write your code here.
// ...

// At termination, `provider.engine.stop()' should be called to finish the process elegantly.
provider.engine.stop();
```

By default, the `HDWalletProvider` will use the address of the first address that's generated from the mnemonic. If you pass in a specific index, it'll use that address instead.

Parameters:

| Parameter | Type | Default | Required | Description |
| ------ | ---- | ------- | ----------- | ----------- |
| `mnemonic` | *`string*` | null | [x] | 12 word mnemonic which addresses are created from. |
| `provider` | `string\|object` | `null` | [x] | URI or Ethereum client to send all other non-transaction-related Web3 requests |
| `address_index` | `number` | `0` | [ ] | If specified, will tell the provider to manage the address at the index specified |
| `num_addresses` | `number` | `1` | [ ] | If specified, will create `number` addresses when instantiated |
| `shareNonce` | `boolean` | `true` | [ ] | If false, a new WalletProvider will track its own nonce-state |
| `wallet_hdpath` | `string` | `"m/44'/60'/0'/0/"` | [ ] | If specified, will tell the wallet engine what derivation path should use to derive addresses. |


### Private Keys

Instead of a mnemonic, you can alternatively provide a private key or array of private keys as the first parameter. When providing an array, `address_index` and `num_addresses` are fully supported.

```javascript
var HDWalletProvider = require("truffle-hdwallet-provider");
//load single private key as string
var provider = new HDWalletProvider("3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580", "http://localhost:8545");

// Or, pass an array of private keys, and optionally use a certain subset of addresses
var privateKeys = [
  "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
  "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290",
];
var provider = new HDWalletProvider(privateKeys, "http://localhost:8545", 0, 2); //start at address_index 0 and load both addresses
```
**NOTE: This is just an example. NEVER hard code production/mainnet private keys in your code or commit them to git. They should always be loaded from environment variables or a secure secret management system.**

## Truffle Usage

You can easily use this within a Truffle configuration. For instance:

truffle.js
```javascript
var HDWalletProvider = require("truffle-hdwallet-provider");

var mnemonic = "mountains supernatural bird ...";

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      // must be a thunk, otherwise truffle commands may hang in CI
      provider: () =>
        new HDWalletProvider(mnemonic, "https://ropsten.infura.io/"),
      network_id: '3',
    }
  }
};
```
