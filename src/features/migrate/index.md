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

*Example network config*

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
