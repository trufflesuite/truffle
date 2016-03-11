# Custom Build Processes

Throughout Truffle's history, it's clear that the [default builder](/getting_started/build) is not for everybody. It has some obvious caveats and is less mature than other build systems. With that in mind, Truffle provides you three ways to override the build system in order to get the most out of Truffle while also using your build process of choice.

### Running an External Command

If you'd like Truffle to run an external command whenever it triggers a build, simply include that option as a string within your project configuration, like so:

```javascript
module.exports = {
  // This will run the `webpack` command on each build.
  //
  // The following environment variables will be set when running the command:
  // WORKING_DIRECTORY: root location of the project
  // NODE_ENV: current environment
  // BUILD_DESTINATION_DIRECTORY: expected destination of built assets (important for `truffle serve`)
  // BUILD_CONTRACTS_DIRECTORY: root location of this environment's .sol.js files  
  // WEB3_PROVIDER_LOCATION: rpc configuration as a string, as a URL needed for web3's http provider.
  //
  build: "webpack"
}
```

Note that you're given ample environment variables with which to integrate with Truffle, detailed above.

### Providing a Custom Function

You can also provide a custom build function like the one below. Note you're given a plethora of information about your project which you can use to integrate tightly with Truffle.

```javascript
module.exports = {
  build: function(options, callback) {
     // Do something when a build is required. `options` contains these values:
     //
     // working_directory: root location of the project
     // contracts: metadata about your contract files, code, etc.
     // contracts_directory: root directory of .sol files
     // rpc: rpc configuration defined in the configuration
     // environment: current environment
     // destination_directory: directory where truffle expects the built assets (important for `truffle serve`)
  }
}
```

### Creating a Custom Module

You could also create a module or object that implements the builder interface (i.e., is an object which contains a `build` function like the one above). This is great for those who want to maintain tighter integration with Truffle and publish a package to make everyone else's lives easier.

Here's an example using Truffle's default builder:

```javascript
var DefaultBuilder = require("truffle-default-builder");
module.exports = {
  build: new DefaultBuilder(...) // specify the default builder configuration here.
}
```

# Bootstrapping Your Frontend

Because you're using a custom build process, Truffle no longer knows how to bootstrap your frontend. You'll need to do this yourself. Here's a list of things your build process and/or application will need to do:

* Include the [Web3](https://github.com/ethereum/web3.js), [Ether Pudding](https://github.com/ConsenSys/ether-pudding) and [bluebird](http://bluebirdjs.com/docs/getting-started.html) Promise dependencies. These are required for the Ether Pudding-based contract abstraction used throughout Truffle.
* `require` or `import` the built `sol.js` files within your environment's `contracts` directory. More information about these build artifacts can be found in the [environments](/advanced/environments) section.
* Call `.load()` on each of your contract abstraction objects, as defined in the [Ether Pudding documentation](https://github.com/ConsenSys/ether-pudding#using-pudding-contracts). This is only required to be done once per application, and is important to make sure each of your contract abstractions reference the same version of Ether Pudding.
* Initialize Web3 and set the provider to point at the Ethereum client listed in your environment's configuration.

Note that Truffle's default builder automatically bootstraps your application and detects whether or not its running inside a wallet like Mist. We recommend you detect this as well and provide the same functionality. See [this example](https://github.com/ethereum/mist/releases/tag/0.3.6).

# Using Webpack

We're still working on having tighter integration with Webpack. However, checkout [this example](https://github.com/ConsenSys/truffle/wiki/Using-Truffle-and-Webpack-(beta)) and let us know how it works for you.
