> _“It's not improbable that a man may receive more solid satisfaction from pudding while he is alive than from praise after he is dead”_

-- Chinese Proverb 

### Ether Pudding

Ether Pudding (or just “Pudding”) is a packager and build artifact manager for Ethereum and Javascript. It turns ABIs, binaries, deployed addresses, etc. into Javascript files you can include in your project with simply a `require`. Example:

```
var Pudding = require("ether-pudding");

// Save a .sol.js file with our Contract data.
var contract_data = {
  abi: [{"constant":true,"inputs":[],"name":"value","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"doStuff","outputs":[],"type":"function"},{"inputs":[],"type":"constructor"}],
  binary: "0x60606040525b5b607b8060126000396000f360606040526000357c0100000000000000000000000000000000000000000000000000000000900480633fa4f245146041578063874f33a114606257603f565b005b604c6004805050606f565b6040518082815260200191505060405180910390f35b606d60048050506078565b005b60006000505481565b5b56",
  address: "0x8e462f3d99ec220404656dee8edf67c6038a68e0"
};
Pudding.save(contract_data, "./MyContract.sol.js");

// Later, require that file and use it immediately:
var MyContract = require("./MyContract.sol.js");
MyContract.setProvider(someWeb3Provider);
MyContract.deployed().doStuff().then(function(tx) {
  // ...
});
```

👏 

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

**Note:** Pudding (the generator) isn't intended to be used in the browser or in a package manager like browserify or webpack, though it likely could be browserified. The resultant `.sol.js` files **_are_**, however. 

```
var Pudding = require("ether-pudding");

var contract_data = {
	abi: ...,              // Array; required.
	binary: "...",         // String; optional.
	unlinked_binary: "..." // String; optional. Defaults to binary.
	address: "..."         // String; optional. 
};

Pudding.save(contract_data, "./MyContract.sol.js");

// The file ./MyContract.sol.js now exists, which you can 
// import into your project like any other Javascript file.
```

#### Using `.sol.js` Files

Once a `.sol.js` has been created, using it is easy. These abstractions use Web3 under the hood, and so will need a provider set just like Web3: 

```
var provider = new Web3.providers.HttpProvider("http://localhost:8545");

var MyContract = require("./MyContract.sol.js");
MyContract.setProvider(provider);
```

Just like Web3, the contract abstraction will need a reference to your Web3 provider. You'll receive errors if you try to make a trasation without a Web3 provider set.

See [Interacting With Your Contracts](https://github.com/ConsenSys/ether-pudding#interacting-with-your-contracts) below for details on how to use the newly created `MyContract` object.

#### Interacting With Your Contracts

Let's explore Pudding contract classes via MetaCoin contract described in [Dapps For Beginners](https://dappsforbeginners.wordpress.com/tutorials/your-first-dapp/):

```javascript
// Require the package
var MetaCoin = require("./path/to/MetaCoin.sol.js");

// Remember to set the Web3 provider (see above).
MetaCoin.setProvider(provider);

// In this scenario, two users will send MetaCoin back and forth, showing
// how Pudding allows for easy control flow. 
var account_one = "5b42bd01ff...";
var account_two = "e1fd0d4a52...";

// Note our MetaCoin contract exists at a specific address.
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

Pudding manages your contract's binary code as well, so you can easily deploy new contracts of the same type using the abstraction:

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

#### More Examples

* [Extending Pudding contract classes](https://github.com/ConsenSys/ether-pudding/wiki/Extending-Pudding-Classes)
* [Setting global contract-level and instance-level defaults](https://github.com/ConsenSys/ether-pudding/wiki/Setting-global,-contract-level-and-instance-level-defaults)
* [When not to use synchronized transactions, and how to do it](https://github.com/ConsenSys/ether-pudding/wiki/When-not-to-use-synchronized-transactions,-and-how-to-do-it)

### Pudding API

#### `Pudding.save([contract_name,] contract_data, filename, options)`

Save contract data as a `.sol.js` file.

* `contract_name`: String. Optional. Name of contract class to be created.
* `contract_data`: Object. Example:

    ```
    {
      abi: ...,              // Array; required.
      binary: "...",         // String; optional.
      unlinked_binary: "..." // String; optional. Defaults to binary.
      address: "..."         // String; optional. 
    }
    ```
    
    Note: `save()` will also accept an already `require`'d contract object. i.e., 
    
    ```
    var MyContract = require("./path/to/MyContract.sol.js");
    
    Pudding.save(MyContract, ...);
    ```
    
* `filename`: Path to save contract file.
* `options`: Object. See below.

The `options` object takes two paramters:

* `options.overwrite`: Boolean. Overwrite the existing contract file if it exists. If true, will ignore previously-saved contract data in the existing file. If false, will create a new contract file and merge in the contract data passed to `save()`. 
* `options.network_id`: String. Will save the contract data passed to `save()` under the specified network id. If no network id is specified, will use network `"default"`. See discussion a about network id's below.

The contract name is only important in the source code that gets generated, which will appear in error messages. If `contract_name` is not present it will default to "Contract".

#### `Pudding.saveAll(contracts, directory, options)`

Save many contracts to the filesystem at once. 

* `contracts`: Object. Keys are the contract names and the values are `contract_data` objects, as in the `save()` function above:

    ```
    {
      "MyContract": {
        "abi": ...,
        "binary": ...
      }
      "AnotherContract": {
        // ...
      }
    }
    ```

* `directory`: String. Destination directory. Files will be saved via `<contract_name>.sol.js` within that directory.
* `options`: Object. Same options listed in `save()` above. 

#### `Pudding.generate([contract_name,] networks)`

Generate the source code that populates the `.sol.js` file, returned as a string.

* `contract_name`: String. Optional. Name of the contract to generate.
* `networks`: Object. Contains the information about this contract for each network, keyed by the network id.

    ```
    {
      "live": {
        "abi": ...,
        "binary": ...,
        "address": ...
      },
      "morden": {
        "abi": ...,
        "binary": ...,
        "address": ...
      },
      "1337": {
        "abi": ...,
        "binary": ...,
        "address": ...
      } 
    }
    ```
    
    Note that each ABI, binary and address refer to the same contract, but deployed on different networks. If no network ids are present -- i.e., a `contract_data` object was passed instead -- then `generate()` will automatically use that data for the default network. i.e., 
    
    ```
    Pudding.generate("MyContract", {
      "abi": ...,
      "binary": ...
    });
    ```
    
The contract name is only important here in the source code that gets generated, which will appear in error messages. If `contract_name` is not present it will default to "Contract".

#### `Pudding.whisk([contract_name,] networks)`

Like `generate()`, this function will create the source code that populates the `.sol.js` file, but instead of returning it as a string it will import it and return an object ready for use. Parameters are the same as `generate()`.

The contract name is only important here in the source code that gets generated, which will appear in error messages. If `contract_name` is not present it will default to "Contract".

```
// Couple examples:

// Whisk in different networks:
var MyContract = Pudding.whisk("MyContract", {
  "live": {
    "abi": ...
    "binary": ...
    "address": ...
  }, 
  "morden": {
    // ...
  }
});

// Or whisk in a single network using the default contract name:
var MyContract = Pudding.whisk({
  "abi": ...,
  "binary": ...,
  "address": ...
});

// Then, use the class immediately:
MyContract.setProvider(someWeb3Provider);
MyContract.defaults({
  from: "0xabcd..."
});
MyContract.new().then(...);
```

### Running Tests

```
$ npm test
```

### License

MIT
