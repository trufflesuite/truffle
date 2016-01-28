**UPGRADE WARNING:** When upgrading to `ether-pudding` v2.x from v1.x, make sure to upgrade any saved `.sol.js` files, especially those in production. [More details here.](https://github.com/ConsenSys/ether-pudding/wiki/Upgrading-from-1.x-to-2.x)

-----------------------------

# The Proof is in the Pudding

Ether Pudding (or just “Pudding”) is an extension of [web3’s](https://github.com/ethereum/web3.js/tree/master) contract abstraction that makes life as a Dapp developer a whole lot easier. With Pudding, you can cleanly write distributed Ethereum applications with less hassle and more reliability, as your app's changes to the blockchain are synchronized so you can easily manage control flow.

Pudding is intended to be used both within Node and within a browser. Although it’s very little code, it packs a whole lot of punch.  

### Reasons to Use Pudding (short list)
* Transactions can be synchronized with the network, so your app/tests won’t receive thier callbacks until the transactions have been processed -- a big win. (See [this example](https://github.com/ConsenSys/ether-pudding/wiki/When-not-to-use-synchronized-transactions,-and-how-to-do-it) for when not to used network-synchronized transactions.)
* Contract functions are “promisified” using bluebird. This makes sequential calls and transactions easier to write.
* Transaction defaults (like a default “from” address) are DRY. You can specify defaults for an individual instance of a contract, for all instances derived from a contract class, or across all Pudding contracts. This makes your code DRY, too.
* With all of the above, developing on Ethereum gets a whole lot easier.    

### Install

**Node**

```
npm install ether-pudding
```

**Browser**

```
<script type="text/javascript" src="web3.js"></script>
<script type="text/javascript" src="bluebird.js"></script>
<script type="text/javascript" src="./build/ether-pudding.min.js"></script>
```

### Using Pudding: For Beginners

Using Pudding in your app is very similar to using web3’s contract abstraction. So similar that you'll need the same information to get started:

1. Your compiled contract's [ABI](https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI).
2. Your compiled contract's binary.

`solc` -- the Solidity compiler from [cpp-ethereum](https://github.com/ethereum/cpp-ethereum) -- can provide you with this information.

Once you have those, you can whisk that together to make a Pudding class:

```javascript
var Web3 = require("web3");
var web3 = new Web3();
var Pudding = require("ether-pudding");
Pudding.setWeb3(web3);

// Set the provider, as you would normally. 
web3.setProvider(new Web3.Providers.HttpProvider("http://localhost:8545"));

var MyContract = Pudding.whisk({
  abi: abi, 
  binary: binary,
  contract_name: "MyContract", // optional
  address: "0xabcd...", // optional, needed for MyContract.deployed()
});
```

See [Interacting With Your Contracts](https://github.com/ConsenSys/ether-pudding#interacting-with-your-contracts) below for details on how to use the newly created `MyContract` object.

### Using Pudding: Advanced 

Often, having to manage your contract's ABIs and binaries is an arduous task, and passing around JSON doesn't fit well into most build environments. This is why Pudding ships with a Node-based generator and loader to make your life much easier.

#### Using Pudding Contracts

Files produced by the generator are called "Pudding contracts", and come packaged within a `.sol.js` file. All `.sol.js` files have an extra step in initialization before they can be used:

```
var Pudding = require("ether-pudding");
var MyContract = require("./js/MyContract.sol.js");
MyContract.load(Pudding);
```

You **must** call the `.load()` method on all Pudding contracts `require`'d into your project. This `.load()` method exists to ensure a single instance of Pudding is used throughout your Pudding contracts. `.load()` changes the contract object in place; once loaded, you can interact with the class like normal.

#### Pudding Generator

You can use Pudding's generator to save `.sol.js` files. Make sure you have a JSON object containing your contracts names, ABIs and binaries, and that `destination` is the directory you'd like them saved into.

```
var PuddingGenerator = require("ether-pudding/generator");
var destination = "/path/to/destination/directory";

var contracts = {
  "MyContract": {
    abi: ...,
    binary: "...",
    address: "..." // deployed address; optional
  },
  ...
};

PuddingGenerator.save(contracts, destination);
```

##### Alternative: `generate`

If you'd rather generate the the Pudding contract source code without saving a file, you can do that per-contract using the `generate` method:

```
var PuddingGenerator = require("ether-pudding/generator");
var source = PuddingGenerator.generate("MyContract", {
  abi: abi,
  binary: binary,
  address: "0xabcd...", // optional
});
```

Note that the `generate()` function needs to be called per-contract, whereas the `save()` method can be passed data for multiple contracts at once.

#### Pudding Loader

In conjunction with the generator, the Pudding Loader can be used to load multiple Pudding contracts into your project at once.

Loading all `.sol.js` classes from a source directory:

```
var source = "/path/to/source/directory";
var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");
Pudding.setWeb3(web3);
PuddingLoader.load(source_directory, Pudding, global, function(error, names) {
  // names represents all classes loaded to the
  // (in this case) global scope. These contracts can
  // now be used immediately. i.e.,
  // 
  // console.log(names[0]); // => "MyContract"
  // MyContract.someFunction().then(...);
});

``` 

You can also get the source code for all Pudding classes in a directory as a single string:

```
var source = "/path/to/source/directory";
var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");
Pudding.setWeb3(web3);
PuddingLoader.packageSource(source_directory, function(error, all_contracts) {
  // all_contracts is a single string containing the source
  // code of all contracts, which you can then include in your
  // build process.
  //
  // Note: all_contracts doesn't fully bootstrap your Pudding classes
  // within the browser. See next section.
});
```

Note that using `packageSource()` isn't necessary if you have a build process that can include the generated classes via different means.

### Interacting With Your Contracts

Let's explore Pudding contract classes via MetaCoin contract described in [Dapps For Beginners](https://dappsforbeginners.wordpress.com/tutorials/your-first-dapp/):

```javascript
var MetaCoin = Pudding.whisk(abi, binary, {gasLimit: 3141592}); 

// In this scenario, two users will send MetaCoin back and forth, showing
// how Pudding allows for easy control flow. 
var account_one = "5b42bd01ff...";
var account_two = "e1fd0d4a52...";

var contract_address = "8e2e2cf785...";

var coin = MetaCoin.at(contract_address);

// Make a transaction that calls the function `sendCoin`, sending 3 MetaCoin
// to the account listed as account_two.
coin.sendCoin(account_two, 3, {from: account_one}).then(function(tx) {
  // This code block will not be executed until Pudding has verified 
  // the transaction has been processed and it is included in a mined block.
  // Pudding will error if the transaction hasn't been processed in 120 seconds.
  
  // Since we're using promises, we can return a promise for a call that will
  // check account two's balance.
  return coin.balances.call(account_two);
}).then(function(balance_of_account_two) {
  alert("Balance of account two is " + balance_of_account_two + "!"); // => 3
  
  // But maybe too much was sent. Let's send some back.
  // Like before, will create a transaction that returns a promise, where
  // the callback won't be executed until the transaction has been processed.
  return coin.sendCoin(account_one, 1.5, {from: account_two});
}).then(function(tx) {
  // Again, get the balance of account two
  return coin.balances.call(account_two)
}).then(function(balance_of_account_two) {
  alert("Balance of account two is " + balance_of_account_two + "!") // => 1.5
}).catch(function(err) {
  // Easily catch all errors along the whole execution.
  alert("ERROR! " + err.message);
});
```

Because you provided your contract's binary code in `Pudding.whisk()`, you can create new contracts that get added to the network really easily:

```javascript
MetaCoin.new().then(function(coin) {
  // From here, the example becomes just like the above.
  // Note that coin.address is the addres of the newly created contract.
  return coin.sendCoin(...);
)}.catch(function(err) {
  console.log("Error creating contract!");
  console.log(err.stack);
)};
```

### More Examples

* [Extending Pudding contract classes](https://github.com/ConsenSys/ether-pudding/wiki/Extending-Pudding-Classes)
* [Setting global contract-level and instance-level defaults](https://github.com/ConsenSys/ether-pudding/wiki/Setting-global,-contract-level-and-instance-level-defaults)
* [When not to use synchronized transactions, and how to do it](https://github.com/ConsenSys/ether-pudding/wiki/When-not-to-use-synchronized-transactions,-and-how-to-do-it)

### Building

First install webpack:

```
npm install -g webpack
```

Then build: 

```
$ wepback
```

### Running Tests

```
$ npm test
```

### License

MIT
