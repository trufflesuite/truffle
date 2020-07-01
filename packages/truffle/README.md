Conflux-Truffle
-----------------------


Conflux-Truffle is a development environment, testing framework and asset pipeline for Conflux, aiming to make life as an Conflux developer easier. With Conflux-Truffle, you get:

* Built-in smart contract compilation, linking, deployment and binary management.
* Automated contract testing with Mocha and Chai.
* Configurable build pipeline with support for custom build processes.
* Scriptable deployment & migrations framework.
* Network management for deploying to many public & private networks.
* Interactive console for direct contract communication.
* Instant rebuilding of assets during development.
* External script runner that executes scripts within a Conflux-Truffle environment.

### Install

```
$ npm install -g conflux-truffle
```

### Quick Usage

For a default set of contracts and tests, run the following within an empty project directory:

```
$ cfxtruffle init
```

From there, you can run `cfxtruffle compile`, `cfxtruffle migrate` and `cfxtruffle test` to compile your contracts, deploy those contracts to the network, and run their associated unit tests.

Conflux-Truffle comes bundled with a local development blockchain server that launches automatically when you invoke the commands  above. If you'd like to [configure a more advanced development environment](http://truffleframework.com/docs/advanced/configuration) we recommend you install the blockchain server separately by running `docker pull pana/conflux-rust` at the command line.

<!-- +  [ganache-cli](https://github.com/trufflesuite/ganache-cli): a command-line version of Conflux-Truffle's blockchain server.
+  [ganache](http://truffleframework.com/ganache/): A GUI for the server that displays your transaction history and chain state. -->
[conflux-rust-docker](https://hub.docker.com/r/confluxchain/conflux-rust)

### Documentation

Please see the [Official Conflux-Truffle Documentation](http://truffleframework.com/docs/) for guides, tips, and examples.


### License

MIT
