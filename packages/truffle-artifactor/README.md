# truffle-artifactor (formerly ether-pudding)

This package saves contract artifacts into into Javascript files that can be `require`'d. i.e.,

```javascript
var artifactor = require("truffle-artifactor");
artifactor.save({/*...*/}, "./MyContract.sol.js") // => a promise

// Later...
var MyContract = require("./MyContract.sol.js");
MyContract.setProvider(myWeb3Provider);
MyContract.deployed().then(function(instance) {
  return instance.doStuff(); // <-- matches the doStuff() function within MyContract.sol.
}).then(function(result) {
  // We just made a transaction, and it's been mined!
  // We're given transaction hash, logs (events) and receipt for further processing.
  console.log(result.tx, result.logs, result.receipt);
});
```

👏

### Features

* Manages contract ABIs, binaries and deployed addresses, so you don't have to.
* Packages up build artifacts into `.sol.js` files, which can then be included in your project with a simple `require`.
* Includes multiple versions of the same contract in a single package, automatically detecting which artifacts to use based on the network version (more on this below).
* Manages library addresses for linked libraries.
* Manages events, making them available on a per-transaction basis (no more `event.watch()`!)

The artifactor uses [truffle-contract](https://github.com/trufflesuite/truffle-contract), which provides features above and beyond `web3`:

* Synchronized transactions for better control flow: transactions won't be considered finished until you're guaranteed they've been mined.
* Promises. No more callback hell. Works well with `ES6` and `async/await`.
* Default values for transactions, like `from` address or `gas`.
* Returning logs, transaction receipt and transaction hash of every synchronized transaction.

### Install

```
$ npm install truffle-artifactor
```

### Example

Here, we'll generate a `.sol.js` files given a JSON object like [truffle-schema](https://github.com/trufflesuite/truffle-schema). This will give us a file which we can later `require` into other projects and contexts.

```javascript
var artifactor = require("truffle-artifactor");

// See truffle-schema for more info: https://github.com/trufflesuite/truffle-schema
var contract_data = {
  abi: ...,              // Array; required.
  unlinked_binary: "..." // String; optional.
  address: "..."         // String; optional.
};

artifactor.save(contract_data, "./MyContract.sol.js").then(function() {
  // The file ./MyContract.sol.js now exists, which you can
  // import into your project like any other Javascript file.
});
```
# API

#### `artifactor.save(options, filename[, extra_options])`

Save contract data as a `.sol.js` file. Returns a Promise.

* `options`: Object. Data that represents this contract:

    ```javascript
    {
      contract_name: "MyContract",  // String; optional. Defaults to "Contract"
      abi: ...,                     // Array; required.  Application binary interface.
      unlinked_binary: "...",       // String; optional. Binary without resolve library links.
      address: "...",               // String; optional. Deployed address of contract.
      network_id: "...",            // String; optional. ID of network being saved within abstraction.
      default_network: "..."        // String; optional. ID of default network this abstraction should use.
    }
    ```

    Note: `save()` will also accept an already `require`'d contract object. i.e.,

    ```javascript
    var MyContract = require("./path/to/MyContract.sol.js");

    artifactor.save(MyContract, ...).then(...);
    ```

  In this case, you can use the `extra_options` parameter to specify options that aren't managed by the contract abstraction itself.

* `filename`: Path to save contract file.
* `extra_options`: Object. Used if you need to specify other options within a separate object, for instance, when a contract abstraction is passed instead of an `options` object.

#### `artifactor.saveAll(contracts, directory, options)`

Save many contracts to the filesystem at once. Returns a Promise.

* `contracts`: Object. Keys are the contract names and the values are `contract_data` objects, as in the `save()` function above:

    ```javascript
    {
      "MyContract": {
        "abi": ...,
        "unlinked_binary": ...
      }
      "AnotherContract": {
        // ...
      }
    }
    ```

* `directory`: String. Destination directory. Files will be saved via `<contract_name>.sol.js` within that directory.
* `options`: Object. Same options listed in `save()` above.

#### `artifactor.generate(options, networks)`

Generate the source code that populates the `.sol.js` file. Returns a String.

* `options`: Object. Subset of options listed in the `save()` function above. Expects:

    ```javascript
  {
      abi: ...,
      unlinked_binary: ...
  }
  ```

* `networks`: Object. Contains the information about this contract for each network, keyed by the network id.

    ```javascript
    {
      "1": {        // live network
        "address": ...
      },
      "2": {        // morden network
        "address": ...
      },
      "1337": {     // private network
        "address": ...
      }
    }
    ```

### Running Tests

```
$ npm test
```

### License

MIT
