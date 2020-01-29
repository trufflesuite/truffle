<img src="https://github.com/trufflesuite/truffle-core/blob/master/assets/logo.png" width="200">

[![npm](https://img.shields.io/npm/v/truffle-core.svg)]()
[![npm](https://img.shields.io/npm/dm/truffle-core.svg)]()
[![Build Status](https://travis-ci.org/trufflesuite/truffle-core.svg?branch=master)](https://travis-ci.org/trufflesuite/truffle-core)
[![Join the chat at https://gitter.im/consensys/truffle](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/consensys/truffle?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

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

See [the documentation](http://truffleframework.com/docs/) for more details.

### Documentation

Please see the [Official Truffle Documentation](http://truffleframework.com/docs/) for guides, tips, and examples.

### Contributing

There are many ways to contribute!

1. Write issues in the [issues tracker](https://github.com/ConsenSys/truffle/issues). Please include as much information as possible!
1. Take a look at [our Waffle](https://waffle.io/ConsenSys/truffle) for prioritization. Note that this includes issues for Truffle and related tools.
1. Contact us in our [gitter chat](https://gitter.im/consensys/truffle)!

Please see the main projects [CONTRIBUTING.md][1] for instructions on how to setup a Development Environment to work on Truffle itself.

[1]:https://github.com/trufflesuite/truffle/blob/develop/CONTRIBUTING.md#development

### Contributors

A project by Consensys and [@tcoulter](https://github.com/tcoulter), and many contributers.

### License

MIT
