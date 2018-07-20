⚠️ **This is an early draft. Details subject to change.** ⚠️

# 🐘 🐘 V5 🐘 🐘  🐘

## 1. All SOLC.

It's now possible to have truffle compile with:
+ any solc-js version listed at [solc-bin](http://solc-bin.ethereum.org/bin/list.json). Specify the one you want and truffle will get it for you.
+ a natively compiled solc binary (you'll need to install this yourself, links to help below).
+ dockerized solc from one of images published [here](https://hub.docker.com/r/ethereum/solc/tags/). (You'll also need to pull down the docker image yourself but it's really easy.)

### List available versions at the command line
```shell
$ truffle compile --list                   # Recent stable releases from solc-bin (JS)
$ truffle compile --list prereleases       # Recent prereleases from solc-bin (JS)
$ truffle compile --list docker            # Recent docker tags from hub.docker.com
$ truffle compile --list releases --all    # Complete list of stable releases.
```

### Specify a solcjs version in `truffle.js`

Set the compiler solc key to the version you'd like. Truffle will fetch it from the solc-bin server and cache it in your local evironment.
```javascript
module.exports = {
  networks: {
    ... etc ...
  },
  compilers: {
     solc: {
       version: <string>  // ex:  "0.4.20". (Default: truffle's installed solc)
     }
  }
};
```

### Using docker / natively built binaries

Solc docker images should be installed locally by running:
```shell
$ docker pull ethereum/solc:0.4.22  // Example image
```
**truffle.js**
```javascript
// Native binary
compilers: {
  solc: {
    version: "native"
  }
}

// Docker
compilers: {
  solc: {
    version: "0.4.22",   // Any published image name
    docker: true
  }
}
```

### Speed comparison
Docker and native binary compilers process large contract sets much faster than solcjs. If you're just compiling a few contracts at a time, the speedup isn't significant relative to the overhead of running a command (see below). The first time truffle uses a docker version there's some extra overhead as it caches the solc version string and a solcjs companion compiler. All subsequent runs should be at full speed.

Times to `truffle compile` on a MacBook Air 1.8GHz, Node 8.11.1

| Project              | # files | solcjs | docker | bin |
|----------------------|---------:| ------:|--------:|-----------:|
| truffle/metacoin-box |       3 |   4.4s |   4.4s |      4.7s |
| gnosis/pm-contracts  |      34 |  21.7s |  10.9s |     10.2s |
| zeppelin-solidity    |     107 |  36.7s |  11.7s |     11.1s |


For help installing a natively built compiler, see the Solidity docs [here](https://solidity.readthedocs.io/en/v0.4.23/installing-solidity.html#binary-packages).

### Contract Profiling.
Truffle has long tried to figure out which contracts changed recently and selectively compile the smallest set necessary, with varying degrees of success. It now *actually* does this. So if you're often writing a test suite and switching back and forth between JS and Solidity changes, you might get some time savings by setting up an `npm` convenience script that looks like this:
```
"test": "truffle compile && truffle test"
```

Many thanks to the Solidity team for making all of the above possible, and for their helpful advice over the last year.


# 2. Web3 1.0.  🏎  🏎

`truffle-contract` now uses Web3 1.0 under the hood.  It's nice! The error handling (especially the parameter checking) is great. And there's lots of new work happening over there  - ENS support is being added and EthPrize is funding an API to make contract packages published to EthPM easily available as well.

We've tried to minimize the number of changes that will be necessary to transition an existing test suite from Web3 0.x to 1.0, but unfortunately some things **will** break, because there have been a number of changes to library's outputs.

First, here's a list things that are new and better:

### Methods / `.new` have an EventEmitter interface *and*  return a promise.
```javascript
example
  .setValue(123)
  .on('transactionHash', hash => {} )
  .on('receipt', receipt => {})
  .on('error', error => {})
  .on('confirmation', (num, receipt) => {} )
  .then( receipt => {} )
```

### Events have an EventEmitter interface
```javascript
example
  .ExampleEvent()
  .on('data', event => ... etc ... )

example
  .ExampleEvent()
  .once('data', event => ... etc ... )
```
### Reason strings!! Find out the reason.
```javascript
# In a Solidity file
require(msg.sender == owner, 'not authorized');

// In JS
try {
  await Example.transferToSelf({from: nonOwner})
} catch (err) {
  assert(err.reason === 'not authorized');
  assert(err.message.includes('not authorized');
}
```

### Overloaded Solidity methods (credit to @rudolfix and @mcdee)
```javascript
example.methods['setValue(uint256)'](123);
example.methods['setValue(uint256,uint256)'](11,55);
```

### Call methods at any block using the `defaultBlock` parameter.
```javascript
const oldBlock = 777;
const valueInThePast = await example.getBalance("0xabc..545", oldBlock);
```

### Automated fueling for method calls and deployments.
```javascript
Example.autoGas = true;   // Defaults to true
Example.gasMultiplier(1.5) // Defaults to 1.25
const instance = await Example.new();
await instance.callExpensiveMethod();
```

### Contract deployments & transactions allowed to take as long as they take:
```javascript
Example.timeoutBlocks = 10000;
const example = await Example.new(1);
// Later....
await example.setValue(5)
```

### Gas estimation for `.new`:
```javascript
const deploymentCost = await Example.new.estimateGas();
```

### Config
To take advantage of the `confirmations` listener and to hear Events using `.on` or `.once`, you'll need to explicitly enable websockets in your network config as below.
```js
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      websockets: true
    }
  }
};
```

### ⚠️ Breaking Changes ⚠️

| Category | Web3 0.0 | Web3 1.0 |
| ------ | ---- | ------- |
| addresses (return value) | lower-case | check-summed (mixed-case) |
| numbers  (return value)  | BigNumber/BN | string |
| tuples (return value)       | Array | Object w/ named & indexed keys |
| `.contract` | same as now | completely different |
|`.at` | sync / then-able | async |


## Migrations

[Coming]