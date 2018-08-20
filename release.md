**DO NOT MERGE** - this is here so people can do review stuff to it if they want to.

⚠️ **Early draft. Details subject to change.** ⚠️

# 🐘 🐘 V5 🐘 🐘  🐘

Good day! We're pleased to announce the first beta release of Truffle v5.
With this release, we're excited to bring you some new features and
improvements that will make your life easier. What's included, you ask?
Well, get ready to use whatever Solidity version you want (Truffle will even
automatically download it for you.) Or how about an improved migrations system,
which dry-runs by default and provides lots of information to understand what
is going right or wrong. Or maybe you've been waiting for Web3.js 1.0. Or
maybe you're sick of typing `.then()` in console and want to use `await`
instead. Truffle v5 has all of this, and more.

If you're as excited as we are and can't wait, here's how to upgrade:
```bash
npm uninstall -g truffle
npm install -g truffle
```

Or keep reading for more information!

- [Bring your own compiler](#Bring-your-own-compiler)
- [Web3.js 1.0](#Web3.js-1.0)
- [New Migrations](#New-Migrations)
- [More](#Even-More!)

## Bring your own compiler

It's now possible to have Truffle compile with:
+ any solc-js version listed at [solc-bin](http://solc-bin.ethereum.org/bin/list.json). Specify the one you want and Truffle will get it for you.
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

Set the compilers solc `version` key to the one you'd like. Truffle will fetch it from the solc-bin server and cache it in your local evironment.
```javascript
module.exports = {
  networks: {
    ... etc ...
  },
  compilers: {
     solc: {
       version: <string>  // ex:  "0.4.20". (Default: Truffle's installed solc)
     }
  }
};
```

### Advanced:
+ docker
+ native binary
+ `path/to/solc`
+ solc settings

Docker images should be installed locally by running:
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

// Relative or absolute path to an npm installed solc-js
compilers: {
  solc: {
    version: "/Users/axic/.nvm/versions/node/v8.9.4/lib/node_modules/solc"
  }
}

// Optimization and EVM version settings
compilers: {
  solc: {
    settings: {
      optimizer: {
        enabled: true, // Default: false
        runs: 1000     // Default: 200
      },
      evmVersion: "homestead"  // Default: "byzantium"
    }
  }
}
```

### Speed comparison
Docker and native binary compilers process large contract sets faster than solcjs. If you're just compiling a few contracts at a time, the speedup isn't significant relative to the overhead of running a command (see below). The first time Truffle uses a docker version there's a small delay as it caches the solc version string and a solcjs companion compiler. All subsequent runs should be at full speed.

Times to `truffle compile` on a MacBook Air 1.8GHz, Node 8.11.1

| Project              | # files | solcjs | docker | bin |
|----------------------|---------:| ------:|--------:|-----------:|
| truffle/metacoin-box |       3 |   4.4s |   4.4s |      4.7s |
| gnosis/pm-contracts  |      34 |  21.7s |  10.9s |     10.2s |
| zeppelin-solidity    |     107 |  36.7s |  11.7s |     11.1s |


For help installing a natively built compiler, see the Solidity docs [here](https://solidity.readthedocs.io/en/v0.4.23/installing-solidity.html#binary-packages).

### Contract Profiling
Truffle has always tried figure out which contracts changed recently and compile the smallest set necessary (with varying degrees of success). It now does this reliably so you may benefit from setting up an `npm` convenience script that looks like this:
```
"test": "truffle compile && truffle test"
```

Many thanks to the Solidity team for making all of the above possible and for their helpful advice over the last year.  🙌 🙌


## 🐇 🐇 Web3.js 1.0 🐇 🐇

**truffle-contract** now uses Web3.js 1.0 under the hood.  It's nice! The error handling (especially the parameter checking) is really good. And there's lots of new work happening over there  - ENS support is being added and [EthPrize](http://ethprize.io/) is funding an API to make contract packages published to EthPM easily available as well.

We've tried to minimize the inconvenience involved in transitioning an existing test suite from Web3 0.x to 1.0. Unfortunately there are some breaking changes due to differences in the way Web3 1.0 formats outputs (see chart below).

The biggest of these is that **truffle-contract** now returns numbers as [BN](https://github.com/indutny/bn.js/) by default instead of [BigNumber](https://github.com/MikeMcl/bignumber.js). This is necessary - BigNumber doesn't have the precision required by the EVM. The number libraries share some methods (notably `.toNumber()`) but their arithmetic operations are quite different.

**Important**: If you receive a number directly from Web3 (e.g. *not* from a **truffle-contract** instance)  you'll get a **string**. Luckily there's a helpful BN conversion method in the Web3 utils.
```javascript
const stringBalance = await web3.eth.getBalance('0xabc..');
const bnBalance = web3.utils.toBN(stringBalance);
```

**Helpful Resources**
+  Web3 1.0's [documentation](https://web3js.readthedocs.io/en/1.0/). Well worth taking a look - lots of differences in their new API.
+ EthWork's [bn-chai](https://github.com/EthWorks/bn-chai) library: BN helpers for your tests. (💡 ProTip courtesy elenadimitrova)

------------
### ⚠️ Breaking Changes ⚠️

| Category | v4 (Web3 0.0) |  v5 (Web3 1.0) |
| ------ | ---- | ------- |
| addresses (return value) | lower-case | check-summed (mixed-case) |
| numbers  (return value)  | BigNumber | BN (configurable) |
| tuples (return value)       | Array | Object w/ named & indexed keys |
| `.contract` (underlying Web3 abstraction)| same as now | completely [different](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html) |
|`.at` (TruffleContract method)| sync / then-able | async |

-----------
### 🍨 Features 🍨

### Methods / `.new` have an EventEmitter interface *and*  return a promise.
```javascript
const example = await artifacts.require("Example").deployed();

example
  .setValue(45)
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

**Solidity**
```solidity
require(msg.sender == owner, 'not authorized');
```

**Javascript**
```javascript
try {
  await example.transferToSelf({from: nonOwner})
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

### Configure number return format
As mentioned above - **truffle-contract** now returns [BN](https://github.com/indutny/bn.js). We've made this configurable so if you have an existing test suite you'd prefer to gradually transition from [BigNumber](https://github.com/MikeMcl/bignumber.js) to BN, it's possible to configure a contract's number format as below.
```javascript
// Choices are:  `["BigNumber", "BN", "String"].
const Example = artifacts.require('Example');
Example.numberFormat = 'BigNumber';
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
To take advantage of the `confirmations` listener and to hear Events using `.on` or `.once`, you'll need to enable websockets in your network config as below.
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

## 🐦 🐦  New Migrations 🐦 🐦

Deploying contracts to public networks is hard ... 🙂 The topic dominates our 10 most visited GitHub issues.  On the bright side, those discussion threads are a rich trove of advice and brilliant insight from experienced Truffle users. V5 includes a rewrite of the `migrations` command that tries to integrate all their hard won knowledge into an easier to use deployment manager.

#### Features
+ **Improved error messaging.**  If Truffle can guess why a deployment failed it tells you and suggests some possible solutions.
+ **More information** about what's going on as you deploy, including cost summaries and real-time status updates about how long transactions have been pending. (See GIF below)
+ **Improved dry run** deployment simulations. This feature has had it's kinks worked out and now runs automatically if you're deploying to a known public network.  You can also use the `--interactive` flag at the command line to get a prompt between your dry run and real deployment.
+ Configure the number of block **confirmations** to wait between deployments. This is helpful when deploying to Infura because their load balancer sometimes executes back-to-back transactions out of sequence and  noncing can go awry.
+ Specify how many **blocks to wait** before timing out a pending deployment. Web3 hardcodes this value at 50 blocks which can be a problem if you're trying to deploy large contracts at the lower end of the gas price range.
+ A deployer interface that works seamlessly with ES6 **async/await** syntax. (Also backward compatible with Truffle V4's then-able pattern.)

⚠️  **Important** ⚠️  If you're using **truffle-hdwallet-provider** with Truffle v5 you **must** install the Web3 1.0 enabled version:
```shell
$ npm install --save truffle-hdwallet-provider@web3-one
```

#### Configuration and use

**Example network config**
```javascript
ropsten: {
  provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io`),
  network_id: 3,
  gas: 5500000,           // Default gas to send per transaction
  gasPrice: 10000000000,  // 10 gwei (default: 20 gwei)
  confirmations: 2,       // # of confs to wait between deployments. (default: 0)
  timeoutBlocks: 200,     // # of blocks before a deployment times out  (minimum/default: 50)
  skipDryRun: true        // Skip dry run before migrations? (default: false for public nets )
},
```

**Example Migration using async / await**
```javascript
const One = artifacts.require("One");
const Two = artifacts.require("Two");

module.exports = async function(deployer) {
  await deployer.deploy(One);

  const one = await One.deployed();
  const value = await one.value();

  await deployer.deploy(Two, value);
};
```
**Deploying to Rinkeby...**


![migrate-rinkeby](https://user-images.githubusercontent.com/7332026/43867960-3499922c-9b20-11e8-8553-589308a6cd61.gif)

**More migrations improvements are coming soon...**.
+ cag from Gnosis has written a really nice addition to the Migrations module that will automatically deploy contract dependencies you've installed with `npm` along with your own contracts.
+ Under the hood, the `migrations` command is now completely evented and managed by a reporter module. Those hooks will be exposed so anyone can write a UI for it and hopefully you'll be plugging into ever more sophisticated deployment script managers soon. Work on the default UI to make it more interactive and colorful is ongoing.

## Even More!

### **truffle-console** now supports async/await

A small but decisive improvement that should make the console much easier to use.
**Example**
```shell
truffle(development)> let instance = await MetaCoin.deployed()
truffle(development)> let accounts = await web3.eth.getAccounts()
truffle(development)> let balance = await instance.getBalanceInEth(accounts[0])
truffle(development)> balance.toNumber()
20000
truffle(development)>
```