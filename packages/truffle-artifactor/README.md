> _“It's not improbable that a man may receive more solid satisfaction from pudding while he is alive than from praise after he is dead”_

-- Chinese Proverb 

### Ether Pudding

Ether Pudding (or just “Pudding”) is a packager and build artifact manager for Ethereum and Javascript. It turns ABIs, binaries, deployed addresses, etc. into Javascript files you can include in your project with simply a `require`. 

### Features

* Managing contract ABIs, binaries and deployed addresses, so you don't have to.
* Packaging up build artifacts into `.sol.js` files, which can then be included in your project with a simple `require`.
* Including multiple versions of the same contract in a single package, automatically detecting which artifacts to use based on the network version (more on this below). 

See the following API discussion for more features.

### API Discussion

We can't go on without noting that Pudding was originally created to be an easier-to-use contract abstraction for Web3. However, Web3 [plans to include a lot of Pudding's features](https://github.com/ethereum/EIPs/issues/68) (like promises) and so Pudding has pivoted to focus on package management. Pudding's original abstraction API still exists, but will be replaced with Web3's once the related EIP has been merged and published.

Some of the features Pudding provides over the current abstraction:

* Synchronized transactions, so your app/tests won’t receive thier callbacks until the transactions have been processed.
* Promises. No more callback hell.
* Default values for transactions, like `from` address or `gas`.

### Install

```
$ npm install ether-pudding
```

### Usage

Pudding consists of two parts: The code generator that generates your `.sol.js` files, and then the `.sol.js` files themselves.

#### Generator

Generate `.sol.js` files given a contract name and contract data, structured as an object. This will save a `.sol.js` file into the destination directory for each contract specified. 

```
var Pudding = require("ether-pudding");
var destination = "/path/to/destination/directory";

var contracts = {
  "MyContract": {
    abi: ...,              // Array; required.
    binary: "...",         // String; optional.
    unlinked_binary: "..." // String; optional. Defaults to binary.
    address: "..."         // String; optional. 
  },
  "OtherContract": {
    ...
  }
};

Pudding.save(contracts, destination);
```

### Using `.sol.js` Files

Once a `.sol.js` has been created, using it is easy. These abstractions use Web3 under the hood, and so will need a provider set just like Web3: 

```
var provider = new Web3.providers.HttpProvider("http://localhost:8545");

var MyContract = require("./path/to/MyContract.sol.js");
MyContract.setProvider(provider);

```

See [Interacting With Your Contracts](https://github.com/ConsenSys/ether-pudding#interacting-with-your-contracts) below for details on how to use the newly created `MyContract` object.

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

### Running Tests

```
$ npm test
```

### License

MIT
