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

// Set the provider, as you would normally. 
web3.setProvider(new Web3.Providers.HttpProvider("http://localhost:8545"));

var MyContract = Pudding.whisk(abi, binary);
```

See [Interacting With Your Contracts](https://github.com/ConsenSys/ether-pudding#interacting-with-your-contracts) below for details on how to use the newly created `MyContract` object.

### Using Pudding: Advanced 

Often, having to manage your contract's ABIs and binaries is an arduous task, and passing around JSON doesn't fit well into most build environments. This is why Pudding ships with a Node-based generator and loader to make your life much easier.

##### Pudding Generator

You can use Pudding's generator to save honest-to-goodness javascript class files that can fit into any build or runtime environment. These class files have the contract's abi and binary embedded in them, making them easy to include in web frontends as well as `require`'d from Node.

To generate the files, make sure you have a JSON object containing your contracts names, ABIs and binaries like below. The class files will be stored with a `.sol.js` extension in the `destination` directory you provide.

```
var PuddingGenerator = require("ether-pudding/generator");
var destination = "/path/to/destination/directory";

var contracts = {
  "ContractName": {
    abi: ...,
    binary: "...",
    address: "..." // deployed address; optional
  },
  ...
};

PuddingGenerator.save(contracts, destination);
```

##### Pudding Loader

The Pudding loader can be used to easily bootstrap Pudding classes into your environment.

Loading classes for use in Node:

```
var source = "/path/to/source/directory";
var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");
Pudding.setWeb3(web3);
PuddingLoader.load(source, Pudding, global, function(error, names) {
  // names represents all classes loaded to the
  // (in this case) global scope. These contracts can
  // now be used immediately. i.e.,
  // 
  // console.log(names[0]); // => "MyContract"
  // MyContract.someFunction().then(...);
});

// Alternative: you can require and load classes individually.
var MyContract = require("./path/to/contract/class").load(Pudding);

``` 

Packaging classes for the Browser (executed from within Node):

```
var source = "/path/to/source/directory";
var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");
Pudding.setWeb3(web3);
PuddingLoader.packageSource(source, function(error, all_contracts) {
  // all_contracts is a single string containing the source
  // code of all contracts, which you can then include in your
  // build process.
  //
  // Note: all_contracts doesn't fully bootstrap your Pudding classes
  // within the browser. See next section.
});
```

Note that using `packageSource()` isn't necessary if you have a build process that can include the generated classes via different means.

##### Bootstrapping Classes in Browser

Because it's important to keep specific references to Pudding intact, Pudding classes require a little bit of extra bootstrapping when in the browser. Consider the following file structure:

```
/classes
  - ContractOne.sol.js
  - ContractTwo.sol.js
  - ContractThree.sol.js
``` 

If you used the Pudding loader's `packageSource()` function, or used some other build process to include all of these files, you'll still need to bootstrap those classes so they can be usable. You can do that via the following example. Imagine that in this example both `Web3` and `Pudding` were previously included via the build process.

```
var web3 = new Web3();
web3.setProvider(new Web3.providers.HttpProvider("http://localhost:8545"));
Pudding.setWeb3(web3);
Pudding.defaults({
  // Optionally set defaults that apply to all contracts
});
Pudding.load([ContractOne, ContractTwo, ContractThree], window);
```

This will bootstrap those classes, applying them to the `window` object and making them usuable within your application.

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

coin.sendCoin(account_two, 3, {from: account_one}).then(function(tx) {
  // This code block will not be executed until Pudding has verified 
  // the transaction has been processed and it is included in a mined block.
  // Pudding will error if the transaction hasn't been processed in 120 seconds.
  
  // Since we're using promises (and this is coffeescript), we can return a 
  // promise for a call that will check account two's balance.
  coin.balances.call(account_two)
}).then(function(balance_of_account_two) {
  alert("Balance of account two is " + balance_of_account_two + "!"); // => 3
  
  // But maybe too much was sent. Let's send some back.
  // Like before, will create a transaction that returns a promise, where
  // the callback won't be executed until the transaction has been processed.
  coin.sendCoin(account_one, 1.5, {from: account_two});
}).then(function(tx) {
  // Again, get the balance of account two
  coin.balances.call(account_two)
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

Pudding is a [Truffle](https://github.com/ConsenSys/truffle) project. First install Truffle:

```
npm install -g truffle
```

Then build: 

```
$ truffle build
```

### Running Tests

Since Pudding is a Truffle project, and Truffle uses Pudding, we need to run Truffle in a special way so that Truffle uses the development version of Pudding.

##### Setup

From your workspace directory, do the following:

```
$ git clone https://github.com/ConsenSys/truffle
$ git clone https://github.com/ConsenSys/ether-pudding
$ cd ether-pudding
$ npm install
$ npm link
$ cd ../truffle
$ npm install
$ npm link ether-pudding 
```

##### Running Tests

With the above, you checked out the latest version of Truffle and the latest version of Pudding, and through `npm link` told Truffle to use that version of Pudding. From here, we need to run Truffle from a local install, which is different than if we installed Truffle globally. From the Truffle directory:

```
$ TRUFFLE_NPM_LOCATION=`pwd` TRUFFLE_WORKING_DIRECTORY="/full/path/to/ether-pudding" ./truffle.bash test 
```

This ensures the local version of Truffle knows where its files are stored and knows which project it is acting on (ether-pudding). Use the `truffle.bash` command as you would use the truffle version installed globally.

**Important Note to Developers:** `npm link` links Truffle with the built version of Pudding, so if you're running tests while actively developing Pudding, you'll want to run the tests in one terminal window while you run `truffle watch` from the `ether-pudding` directory in another.

I know this is complicated, but it's a trade off between a complicated test setup or even more complicated tests, where we'd need to distinguish between two different versions of Pudding. Ick.

### License

MIT
