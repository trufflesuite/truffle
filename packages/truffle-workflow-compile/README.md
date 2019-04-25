# truffle-workflow-compile
Core workflow logic for the `truffle compile` command behavior

### install

```
$ npm install truffle-workflow-compile
```

### Usage

```javascript
const Contracts = require("truffle-workflow-compile");

// expected config object
const config = {
  contracts_directory: "/users/myPath/to/contracts", // dir where contracts are located
  contracts_build_directory: "/users/myPath/to/buildDir" // dir where contract artifacts will be saved
};

// compiles contracts found in contracts_directory,
// saves them in contracts_build_directory
Contracts.compile(config, () => {
  console.log("Compilation complete!");
});

// alternative making use of the expected callback
Contracts.compile(config, (err, output) => {
  if (err) console.error(err);
  else console.log(output)
});
```
