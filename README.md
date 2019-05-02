<img src="https://truffleframework.com/img/truffle-logo-dark.svg" width="200">

[![npm](https://img.shields.io/npm/v/truffle.svg)](https://www.npmjs.com/package/truffle)
[![npm](https://img.shields.io/npm/dm/truffle.svg)](https://www.npmjs.com/package/truffle)
[![Join the chat at https://gitter.im/consensys/truffle](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/consensys/truffle?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/trufflesuite/truffle.svg?branch=next)](https://travis-ci.org/trufflesuite/truffle)
[![Coverage Status](https://coveralls.io/repos/github/trufflesuite/truffle/badge.svg?branch=next)](https://coveralls.io/github/trufflesuite/truffle?branch=next)

-----------------------


Truffle is a development environment, testing framework and asset pipeline for Ethereum, aiming to make life as an Ethereum developer easier. With Truffle, you get:

* Built-in smart contract compilation, linking, deployment and binary management.
* Automated contract testing with Mocha and Chai.
* Configurable build pipeline with support for custom build processes.
* Scriptable deployment & migrations framework.
* Network management for deploying to many public & private networks.
* Interactive console for direct contract communication.
* Instant rebuilding of assets during development.
* External script runner that executes scripts within a Truffle environment.

| ℹ️ **Contributors**: Please see the [Development](#development) section of this README. |
| --- |

### Install

```
$ npm install -g truffle
```

### Quick Usage

For a default set of contracts and tests, run the following within an empty project directory:

```
$ truffle init
```

From there, you can run `truffle compile`, `truffle migrate` and `truffle test` to compile your contracts, deploy those contracts to the network, and run their associated unit tests.

Truffle comes bundled with a local development blockchain server that launches automatically when you invoke the commands  above. If you'd like to [configure a more advanced development environment](https://truffleframework.com/docs/advanced/configuration) we recommend you install the blockchain server separately by running `npm install -g ganache-cli` at the command line.

+  [ganache-cli](https://github.com/trufflesuite/ganache-cli): a command-line version of Truffle's blockchain server.
+  [ganache](https://truffleframework.com/ganache/): A GUI for the server that displays your transaction history and chain state.


### Documentation

Please see the [Official Truffle Documentation](https://truffleframework.com/docs/) for guides, tips, and examples.

### Development

We welcome pull requests. To get started, just fork this repo, clone it locally, and run:

```shell
# Install
npm install -g lerna@3.4.3
npm install -g yarn
yarn bootstrap

# Test
yarn test

# Adding dependencies to a package
cd packages/<truffle-package>
yarn add <npm-package> [--dev] # Use yarn
```

If you'd like to update a dependency to the same version across all packages, you might find [this utility](https://www.npmjs.com/package/lerna-update-wizard) helpful.

*Notes on project branches:*
+    `master`: Stable, released version (v5)
+    `beta`: Released beta version
+    `develop`: Work targeting stable release (v5)
+    `next`: Upcoming feature development and most new work

Please make pull requests against `next` for any substantial changes. Small changes and bugfixes can be considered for `develop`.

There is a bit more information in the [CONTRIBUTING.md](./CONTRIBUTING.md) file.

### License

MIT
