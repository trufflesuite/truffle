# truffle-hdwallet-provider
HD Wallet-enabled Web3 provider. Use it to sign transactions for addresses derived from a 12-word mnemonic.

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
```

By default, the `HDWalletProvider` will use the address of the first address that's generated from the mnemonic. If you pass in a specific index, it'll use that address instead. Currently, the `HDWalletProvider` manages only one address at a time, but it can be easily upgraded to manage (i.e., "unlock") multiple addresses.

Parameters:

| Parameter | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| mnemonic | *string* | null | <required> 12 word mnemonic which addresses are created from. |
| provider_uri | *string* | null | <required> URI of Ethereum client to send all other non-transaction-related Web3 requests |
| address_index | *number* | 0 | <optional> If specified, will tell the provider to manage the address at the index specified |
| num_addresses | *number* | 1 | <optional> If specified, will create `number` addresses when instantiated |
| shareNonce | *boolean* | true | <optional> If false, a new WalletProvider will track its own nonce-state |

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
