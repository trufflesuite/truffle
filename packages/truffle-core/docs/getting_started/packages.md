# Package Management

Truffle comes standard with `npm` integration, and is aware of the `node_modules` directory in your project if it exists. This means you can use and distribute contracts, dapps and Ethereum-enabled libraries via `npm`, making your code available to others and other's code available to you.

### Package Layout

Projects created with Truffle have a specific layout by default which enables them to be used as packages. This layout isn't required, but if used as a common convention -- or "de-facto standard" -- then distributing contracts and dapps through package management will become much easier.

The most important directories in a Truffle package are the following:

* `/contracts`
* `/build` (which includes `/build/contracts`, created by Truffle)

The first directory is your contracts directory, which includes your raw Solidity contracts. The second directory is the build directory, and more specifically `/build/contracts`, which holds build artifacts in the form of `.sol.js` files. Including raw contracts in your package will allow others to import those contracts within their own solidity code. Similarly, including your `.sol.js` build artifacts in your package will allow others to seamlessly interact with your contracts from Javascript, which can be used in dapps, scripts and migrations.

# Using a Package

When using a package within your own project, it is important to note that there are two places where you might be interested in using other's contract code: within your contracts (`.sol` files) and within your Javascript code (`.sol.js` files). The following provides an example of each case, and discusses techniques for making the most of other's contracts and build artifacts.

### Installing

For this example, we're going to use the [Example Truffle Library](https://github.com/ConsenSys/example-truffle-library), which provides a simple name registry that is deployed to the Morden test network. In order to use it as a dependency, we must first install it within our project through `npm`:

```
$ cd my_project
$ npm install example-truffle-library
```

Note that the last command above downloads the package and places it in `my_project/node_modules` directory, which is important for the examples below. See the [npm documentation](https://docs.npmjs.com/) for help using `npm` to install packages.

### Within Your Contracts

To use a package's contracts within your contracts, this can be as simple as Solidity's [import](http://solidity.readthedocs.io/en/develop/layout-of-source-files.html?#importing-other-source-files) statement. When your import path isn't [explicitly relative or absolute](/getting_started/compile/#dependencies), this signifies to Truffle that you're looking for a file from a specific named package. Consider this example using the Example Truffle Library mentioned above:

```
import "example-truffle-library/contracts/SimpleNameRegistry.sol";
```

Since the path didn't start with `./`, Truffle knows to look in your project's `node_modules` directory for the `example-truffle-library` folder. From there, it resolves the path to provide you the contract you requested.

### Within Javascript Code

To interact with package's contracts within Javascript code, you simply need to `require` that package's `.sol.js` files like so:

```
var SimpleNameRegistry = require("example-truffle-library/build/contracts/SimpleNameRegistry.sol.js");
```

These files are provided by [EtherPudding](https://github.com/ConsenSys/ether-pudding), which Truffle uses internally. See EtherPudding's documentation for more information.

### Package's Deployed Addresses

Sometimes you want your contracts to interact with the package's previously deployed contracts. Since the deployed addresses exist within the package's `.sol.js` files, you must perform an extra step to get those addresses into your contracts. To do so, make your contract accept the address of the dependency contract, and then use migrations. The following is an example contract that exists within your project as well as an example migration:

Contract: MyContract.sol

```
import "example-truffle-library/contracts/SimpleNameRegistry.sol";

contract MyContract {
  SimpleNameRegistry registry;
  address public owner;

  function MyContract {
    owner = msg.sender;
  }

  // Simple example that uses the deployed registry from the package.
  function getModule(bytes32 name) returns (address) {
    return registry.names(name);
  }

  // Set the registry if you're the owner.
  function setRegistry(address addr) {
    if (msg.sender != owner) throw;

    registry = SimpleNameRegistry(addr);
  }
}

```

Migration: 3_hook_up_example_library.js

```
var SimpleNameRegistry = require("example-truffle-library/build/contracts/SimpleNameRegistry.sol.js");

module.exports = function(deployer) {
  // Deploy our contract, then set the address of the registry.
  deployer.deploy(MyContract).then(function() {
    MyContract.deployed().setRegistry(SimpleNameRegistry.address);
  });
};
```

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
