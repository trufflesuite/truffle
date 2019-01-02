There have been a whole bunch of changes made to Truffle's migration function.

{"gitdown": "contents", "maxLevel": 5, "rootId": "user-content-what-s-new-in-truffle-v5-truffle-migrate"}

#### Improved error messaging
Now if Truffle can guess why a deployment failed it tells you and suggests some possible solutions.

#### More output
The information that Truffle provides during migrations is now more robust.  There is much more about what's going on as you deploy, including cost summaries and real-time status updates about how long transactions have been pending. (See GIF below)

#### Improved dry run
Now if you are deploying to a known public network, Truffle will automatically do a test dry run beforehand.  You can also use the `--interactive` flag at the command line to get a prompt between your dry run and real deployment.

#### Wait for confirmations and custom block timeouts
You can now configure the number of block confirmations to wait between deployments. This is helpful when deploying to Infura because their load balancer sometimes executes back-to-back transactions out of sequence and noncing can go awry.
You can also specify how many blocks to wait before timing out a pending deployment.
```javascript
module.exports = {
  networks: {
    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io`),
      network_id: 3,
      gas: 5500000,           // Default gas to send per transaction
      gasPrice: 10000000000,  // 10 gwei (default: 20 gwei)
      confirmations: 2,       // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,     // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true        // Skip dry run before migrations? (default: false for public nets )
    }
  }
}
```

#### `async` Migrations
The deployer interface now works seamlessly with ES6 **async/await** syntax. (Also backward compatible with Truffle V4's then-able pattern.)

*Example Migration using async / await*
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
