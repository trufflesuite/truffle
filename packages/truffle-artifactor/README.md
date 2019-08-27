# truffle-artifactor

This package saves contract artifacts into JSON files

```javascript
const Artifactor = require("truffle-artifactor");
const artifactor = new Artifactor(__dirname);
artifactor.save({/*...*/}); // => a promise saving MyContract.json to a given destination
```

👏

### Features

* Manages contract ABIs, binaries and deployed addresses, so you don't have to.
* Packages up build artifacts into `.json` files, which can then be included in your project with a simple `require`.
* Manages library addresses for linked libraries.

The artifactor can be used with [truffle-contract](https://github.com/trufflesuite/truffle/tree/develop/packages/truffle-contract), which provides features above and beyond `web3`:

* Synchronized transactions for better control flow: transactions won't be considered finished until you're guaranteed they've been mined.
* Promises. No more callback hell. Works well with `ES6` and `async/await`.
* Default values for transactions, like `from` address or `gas`.
* Returning logs, transaction receipt and transaction hash of every synchronized transaction.

### Install

```
$ npm install truffle-artifactor
```

### Example

Here, we'll generate a `.json` files given a JSON object like [@truffle/contract-schema](https://github.com/trufflesuite/truffle/tree/develop/packages/contract-schema). This will give us a file which we can later `require` into other projects and contexts.

```javascript
const Artifactor = require("truffle-artifactor");
const artifactor = new Artifactor(__dirname);

// See truffle-schema for more info: https://github.com/trufflesuite/truffle/tree/develop/packages/contract-schema
const contractData = {
  contractName: "...",        // String; optional.
  abi: ...,                   // Array; required.
  metadata: "...",            // String; optional.
  bytecode: "...",            // String; optional.
  "x-some-dependency": ...    // String, Number, Object, or Array: optional.
};

artifactor.save(contractData);
// The file ./MyContract.json now exists, which you can
// import into your project like any other Javascript file.
```

# API

#### `artifactor.save(contractData)`

Save contract data as a `.json` file. Returns a Promise.

* `contractData`: Object. Data that represents this contract:

    ```javascript
    {
      contractName: "MyContract",   // String; optional. Defaults to "Contract".
      abi: ...,                     // Array; required.  Application binary interface.
      metadata: "...",              // String; optional. Contract metadata.
      bytecode: "...",              // String; optional. Contract-creation binary without resolve library links.
      deployedBytecode: "...",      // String; optional. On-chain deployed binary without resolve library links.
      sourceMap: "...",             // String; optional. Source mapping for bytecode.
      deployedSourceMap: "...",     // String; optional. Source mapping for deployedBytecode.
      source: "...",                // String; optional. Uncompiled source code for contract.
      sourcePath: "...",            // String; optional. File path for uncompiled source code.
      ast: ...,                     // Object; optional. JSON representation of contract source code, as output by compiler.
      legacyAST: ...,               // Object; optional. Legacy JSON representation of contract source code, as output by compiler.
      compiler: ...,                // Object; optional. Compiler "type" and "properties".
      networks: ...,                // Object; optional. Mapping of network ID keys to network object values (address information, links to other contract instances, and/or contract event logs).
      schemaVersion: "...",         // String; optional. Schema version used by contract object representation.
      updatedAt: "...",             // String; optional. Time contract object representation was generated/most recently updated.
      devdoc: "...",                // String; optional. Developer documentation.
      userdoc: "...",               // String; optional. User documentation.
      "x-custom-property": ...      // String, Number, Object, or Array: optional. Custom property. Keys must be prefixed with "x-".
    }
    ```

#### `artifactor.saveAll(contracts)`

Save many contracts to the filesystem at once. Returns a Promise.

* `contracts`: Object. Keys are the contract names and the values are `contractData` objects, as in the `save()` function above:

    ```javascript
    {
      "MyContract": {
        "abi": ...,
        "bytecode": "..."
      }
      "AnotherContract": {
        // ...
      }
    }
    ```

### Running Tests

```
$ npm test
```

### License

MIT
