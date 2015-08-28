# Truffle

[![Join the chat at https://gitter.im/consensys/truffle](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/consensys/truffle?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


Truffle is a development environment, testing framework and asset pipeline for Ethereum, aiming to make life as an Ethereum developer easier. With Truffle, you get:

* Automated contract testing with Mocha and Chai.
* A configurable build pipeline that supports both web apps and console apps.
* Generators for creating new contracts and tests (like `rails generate`)
* Instant rebuilding of assets during development (`truffle watch`)
* Console to easily work with your compiled contracts (`truffle console`)
* Script runner that lets you run JS/Coffee files with your contracts included (`truffle exec`) 
* Contract compilation and deployment using the RPC client of your choice.
* Support for JavaScript, CoffeeScript, SASS, ES6 and JSX built-in.

Truffle shares many similarities to the [Embark Framework](https://iurimatias.github.io/embark-framework/) but differs in philosophy. The main development goals of Truffle are: 

* **Platform Agnostic Build Process:** Truffle aims to support everything from web applications with full user interfaces to Etherum-backed console applications to standalone library wrappers that help you interact with specific contracts, all with their own unique build requirements. You can think of Truffle as a replacement for grunt. Since it builds everything down to flat files, it's guaranteed to work with your environment.
 
* **Client Agnostic Development Process:** When you're developing you want your results fast and quick. But when you're gearing up to deploy production contracts you want your code stable and correct. Truffle is built without a dependency on any specific Ethereum client, so when you're developing you can use something the [TestRPC](https://github.com/ConsenSys/testrpc) to quickly get the results you want, but when you're ready to deploy you can double check your app against `geth` or `eth` to make sure it is working as intended.

* **Language Agnostic Codebase:** Truffle ships with support for JavaScript, CoffeeScript, SASS, ES6 and JSX built-in, but if you want to use a different langage like HAML or CJSX or Handlebars or Jade you can easily tell Truffle how to process it. 

* **Fully Configurable Directory Structure:** As Truffle is meant to support any style of application, the `app` directory is your oyster. You're not required to have the typical `css`,`javascript`, and `html` directories. You have full control over the build process and can easily specify how your app should be structured within your `app.json` config file.

* **Real Tests:** Truffle is hell-bent on allowing you to run *real* contract code on *real* Ethereum clients so you know how your contracts will actually perform for your users. Though we suggest you use the [TestRPC](https://github.com/ConsenSys/testrpc) during development, you can easily swap it out for `geth` or `eth` and re-run your tests without changing a single line of code.

### Installation

`$ npm install -g truffle`

Ensure you're also running an RPC client that can compile Solidity contracts.

### Usage & Available Commands:

```
Usage: truffle [command] [options]

build           => Build development version of app; creates ./build directory
console         => Run a console with deployed contracts instanciated and available (REPL)
compile         => Compile contracts
create:contract => Create a basic contract
create:test     => Create a basic test
deploy          => Deploy contracts to the network
dist            => Create distributable version of app (minified); creates ./dist directory
exec            => Execute a Coffee/JS file within truffle environment. Script must call process.exit() when finished.
init            => Initialize new Ethereum project, including example contracts and tests
init:config     => Initialize default project configuration
init:contracts  => Initialize default contracts directory
init:tests      => Initialize tests directory structure and helpers
list            => List all available tasks
test            => Run tests
version         => Show version number and exit
watch           => Watch project for changes and rebuild app automatically
```

### Example Workflow

```
$ truffle init
$ truffle deploy
$ truffle build
$ truffle test

  Contract: Example
    ✓ should assert true

  1 passing (5ms)

```

The above will initialize a new Ethereum application with an example contract and an example test. Then it will deploy the contracts to the network, build the application’s frontend and then run the tests.

### dApp Structure

```
app/...                      # App code. See "App Configuration", below.
contracts/                   # Solidity contracts
config/
    |___ app.json            # App configuration (build, rpc, deployed contracts, etc.)
    |___ development/        # Environment directory (development)
        |___ config.json     # Environment configuration (overrides app.json)
        |___ contracts.json  # Contract configuration (built during contract deployment)
    |___ staging/...         # Other environments. Can be renamed/deleted. 
    |___ production/...
    |___ test/...              
test/                        # Mocha/Chai tests
build/                       # Built app (created by `truffle build`)
dist/                        # Built and minified app (created by `truffle dist`) 
```

### Environments & App Configuration

Truffle infers your app configuration by first reading `./config/app.json`, and then overriding those values with the `config.json` of your current environment. If no environment is specified, the **default environment** is **development**. In this sense, `app.json` acts as a base configuration that your current environment can then modify. 

Your `app.json` file and environment configuration files (collectively, `config.json`) make up your app’s configuration. They expect three main values to be set:

* `build`
* `deploy`, and
* `rpc`

When using `truffle init`, you'll be given the configuration below that's meant to be used for web-based distributed application. Everything you see is completely configurable:

```javascript
{
  "build": {
    // Copy ./app/index.html (right hand side) to ./build/index.html.
    "index.html": "index.html",
    "app.js": [
      // Paths relative to "app" directory that should be
      // concatenated and processed during build.
      "javascripts/app.js" 
    ],
    "app.css": [
      // Paths relative to "app" directory that should be
      // concatenated and processed during build.
      "stylesheets/app.scss"
    ],
    "images/": "images/"
  },
  "deploy": [
    // Names of contracts that should be deployed to the network.
    "Example"
  ],
  "rpc": {
    // Default RPC configuration.
    "host": "localhost",
    "port": 8545
  }
}
```

Let's look at the three main objects within this configuration, starting with `rpc`.

##### RPC Configuration

The `rpc` object within your app's configuration specifies the host and port Truffle will connect to when interacting with the Ethereum network. The `rpc` object within `app.json` specifies a default host and port *across every environment* -- this is included solely so every environment will have an RPC client to connect to (in the development environment, for instance, this is usually a client running on your local machine). You can override this value in other environments' `config.json` file if you have a dedicated RPC client for those networks / environments.

##### Deployable Contracts Configuration

If you're building a complex set of contracts, you likely don't want to deploy all of them to the network. For instance, you may be building a hub contract that, when a function is called, creates instances of other "spoke" contracts. You'll want to compile each of these contracts up front so you're frotend can interact with them when the time comes, but you'll only want to deploy the hub contract initially.   

Truffle allows you to specify which contracts should be deployed by adding the `deploy` array to `app.json`. This array is simply a list of contract names, where every name matches up with its associated contract. For instance, the following will tell Truffle to only deploy `Example.sol`:

```javascript
"deploy": [
  "Example"
]
```

##### Build Configuration

Truffle allows you to have a completely configurable directory structure so you’re not forced to organize your files in any specific way. Though you have a lot of power, we'll only mention the basics here. See the section below about Extending the Pipeline for more details.

The default build configuration looks like this:

```javascript
"build": {
  // Copy ./app/index.html (right hand side) to ./<build or dist>/index.html.
  "index.html": "index.html",
  "app.js": [
    // Paths relative to "app" directory that should be
    // concatenated and processed during build.
    "javascripts/app.js" 
  ],
  "app.css": [
    // Paths relative to "app" directory that should be
    // concatenated and processed during build.
    "stylesheets/app.scss"
  ],
  // Note: You can also include directories.
  // This will copy a static images directory to the build directory.
  "images/": "images/"
}
```

The `build` configuration allows for any number of key/value pairs, called "targets". Each target has a file name as a key and an array of paths as the value. The key specifies the resultant file that the array of paths will be compiled down into. The paths are relative to the `./app` directory, and -- based on the file extension -- will be sent through a specific preprocessor. Truffle ships with support for the following preprocessors:

* `.es`     (compiles down to JS via Babel) 
* `.es6`    (compiles down to JS via Babel)
* `.jsx`    (compiles down to JS via Babel)
* `.coffee` (compiles down to JS via CoffeeScript)
* `.scss`   (compiles down to CSS via node-sass). 

Even though the following five processors are available, you can still write your code using traditional extensions, like:

* `.js`
* `.css`
* `.html`
* `.json`

Some files go through post-processing after the array of files are preprocessed. `app.js` is considered special to Truffle: If given, Truffle will inject your contracts and a few dependencies (like `web3`) so they're automatically made available to you on the frontend. Truffle will also set web3's provider for you based on your environment's RPC configuration. You can remove this post-processing step, however, if desired. See the Extending the Pipeline section below. 

If a target is given a string instead of an array, that target will be assumed to have only one file, which will be preprocessed as normal. Targets can also be directories: If this is the case, the target's key must end in `/` and the value must be a string specifying where the directory should be copied, relative to the build directory. This is a direct copy and won't incur any pre- or post-processing.

**Note:** All JSON files in Truffle allow Javascript comments which are ignored by our JSON parser. This is non-standard JSON syntax, and should be removed if its causing you issue.

### Building & Distributing Your App

Truffle uses the term “build” to mean transforming your `app` code into an executable and distributable package, sending your code through the pipeline to produce raw HTML, CSS and Javascript (e.g., if you're building a web app). Building is easy. Simply run:

```
$ truffle build
```

This will create a new, built version of the app in the `./build` directory. Using the default `app.json`, you can run your app by simply opening up `./build/index.html` in your browser. 

You can have Truffle automatically build your app when you save changes:

```
$ truffle watch
Waiting...
```

When you’re ready to create a version of your app ready for distribution (think, minified Javascript), simply run:

```
$ truffle dist
```

This will create another version of your app with the Javascript minified in the `./dist` directory. `truffle dist` defaults to the production environment, injecting contracts that have been deployed to the main network. You can override the environment used. See Command Reference below.

If you're using the default `app.json` configuration, you'll notice that the structure of the `./build` and `./dist` directories represent the targets specified in the `frontend` configuration:

```
build/
    |___ app.js      # Compiled Javascript
    |___ app.css     # Compiled CSS
    |___ index.html  # Main index file.
    |___ images/     # Static images directory copied from ./app.
```

We recommend you do not commit the `./build` directory in your code repository as it’s only meant for development. However, we strongly recommend you commit the `./dist` directory because it's meant to represent the last good distributable version of the app. 

### Interacting With Contracts (Frontend)

Truffle apps use [Pudding](https://github.com/ConsenSys/ether-pudding) under the hood for interfacing with contracts and the network. Pudding allows for easy control flow within your app and tests while still giving you the standard contract abstraction provided by `web3`. 

In order to provide the same interface both within your app’s frontend as well as within your tests, when you build your app, the following is included for you as part of your compiled javascript (in this order): 

* `Promise`, provided by bluebird.
* `web3`: The web3 library
* `ether-pudding`: The Pudding abstraction on top of web3
* Your contracts (via Pudding). These are added as globally acessible variables, so if you have a contract called `MyCoin`, for instance, the `MyCoin` class will be available to you.

Note that since Truffle aims to be extensible, it will **only** provide these dependencies by default for the build target called **app.js**. You can add these dependencies to other targets by viewing the Extending the Pipeline section.

Once in your app's frontend, you can get the deployed address of contract by accessing `YourContract.deployed_address`. If you're contract was called `MyCoin`, you could access the previously deployed contract like this:

```javascript
var deployed = MyCoin.at(MyCoin.deployed_address);
```

### Testing Contracts

Truffle standardizes on [Mocha](http://mochajs.org/) for running tests and [Chai](http://chaijs.com/) for assertions. By default, Truffle uses the `assert` style of assertions provided by Chai, but you’re not prevented from using other styles. An example test for a coin-like contract looks like this: 

```javascript
contract('MyCoin', function(accounts) {

  it("should give me 20000 coins on contract creation", function(done) { 
    var coin = MyCoin.at(MyCoin.deployed_address);
    coin.balances.call().then(function(my_balance) {
      assert.isTrue(20000, my_balance, "I was not given 20000 on contract creation!");
      done();
    }).catch(done);
  });
  
});   
```

To run this test, simply type:

```
$ truffle test
Tims-MacBook-Pro:test tim$ truffle test

  Contract: MyCoin
    ✓ should give me 20000 coins on contract creation

  1 passing (4ms)
```

Note that in your tests, your contract classes are created for you, and are globally accessible (e.g., `MyCoin`). Similarly, `web3` is already included and the default provider has already been set based on your **test environment’s** RPC configuration (if the test environment is not found, it uses the default configuration). Note that the `contract` function is synonymous for Mocha’s `describe`, except that it provides better output.

All transactions made within your tests are sent from the first account available (`accounts[0]`) and have a default `gasLimit` of 3141592. You can override these through Pudding or through the transaction function’s own parameters.

Your contracts are redeployed at the start of each `contract` block. This ensures the least amount of conflicts between tests while making a tradeoff for runtime. You need to ensure that your main account (`accounts[0]`; your coinbase) has enough Ether to deploy and run your tests. To avoid this problem completely, we recommend running tests using the [TestRPC](https://github.com/ConsenSys/testrpc). 

### Command Reference

##### build           

Build a development version of the app; creates the ./build directory.

```
$ truffle build
```

Optional parameter:

* `-e environment`: Specify the environment. Default is "development".

When building, if a build target of `app.js` is specified, Truffle will include the environment's contracts as a dependency. 

##### console

Run a console with your contract objects instantiated and ready to use (REPL). 

```
$ truffle console
```

Once the console starts you can then use your contracts via the comamnd line like you would in your code. 

Optional parameters:

* `-e environment`: Specify the environment. Default is "development". 
* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### compile

Compile your contracts. This will only compile and display compile errors if there are any. It does not modify any project state or deploy to the network. The `compile` command uses the RPC to compile contracts, so you need to make sure your RPC client is capable of compiling your desired contract language.

```
$ truffle compile
```

Optional parameter:

* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### create:contract

Helper method to scaffold a new contract. Name must be camel-case.

```
$ truffle create:contract MyContract
```

##### create:test

Helper method to scaffold a new test for a contract. Name must be camel-case.

```
$ truffle create:test MyTest
```

##### deploy

Compile and deploy contracts to the network. Will only deploy the contracts specified in the app configuration's `deploy` array.

```
$ truffle deploy
```

Optional parameters:

* `-e environment`: Specify the environment. Default is "development". 
* `--verbose-rpc`: Log communication between Truffle and the RPC.

Deploying contracts will save a new `contracts.json` file within the specified environment that documents contract state (ABI, deployed address, binary code, etc.).

##### dist           

Build a distributable version of the app; creates the ./dist directory.

```
$ truffle dist
```

Optional parameter:

* `-e environment`: Specify the environment. Default is "production".

When building, if a build target of `app.js` is specified, Truffle will include the environment's contracts as a dependency.

##### exec

Execute a Javascript or CoffeeScript file within the Truffle environment. This will include `web3`, set the default provider based on the app configuration, and include the environment's contracts within the specified script. **This is a limited function.** Your script **must** call process.exit() when it is finished or `truffle exec` will never exit.

```
$ truffle exec /path/to/my/script.js
```

Optional parameter:

* `-e environment`: Specify the environment. Default is "development".

##### init

Create a completely new app within the current working directory. Will add default contracts, tests and frontend configuration.

```
$ truffle init
```

##### init:config

Like `truffle init`, but only initializes the `config` directory.

```
$ truffle init:config
```

##### init:contracts

Like `truffle init`, but only initializes the `contracts` directory.

```
$ truffle init:contracts
```

##### init:tests

Like `truffle init`, but only initializes the `test` directory.

```
$ truffle init:tests
```

##### list

List all available commands and exit. Synonymous with `--help`.

```
$ truffle list
```

##### test

Run all tests within the `./test` directory.

```
$ truffle test
```

Optional parameters:

* `-e environment`: Specify the environment. Default is "test".
* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### version

Show version number and exit.

```
$ truffle version
```

##### watch

Watch for changes to contracts, app and configuration files. When there's a change, rebuild the app using `truffle build`.

```
$ truffle watch
```

### Extending the Pipeline

Truffle's asset pipeline is completely extensible. For instance, you have the ability to change the way Truffle processes Javascript (say, you want to use [Babel](https://babeljs.io/)), and you can also tell Truffle how to process new file types it doesn't understand by default. Beyond that, you can tell Truffle how it should post-process files (if at all) after sending them through the pipeline. We'll discuss each of these situations below.

##### Basics

For each target listed in your app's `build` configuration, the pipeline consists of three steps:

1. Process each file in the array of files associated with the target, using the file extension to determine which processor to use.
2. After processing each file, concatenate all the results.
3. Send the concatenated result through post processors that perform additional work on the resultant file.

##### Example: Integrating ReactJS & the CJSX Extension

Here we'll tell Truffle how to process CJSX files (CoffeeScript + JSX) for a React-based app.

First, download [ReactJS](https://fb.me/react-0.13.3.js) and add it to your `app.json`:

```
"app.js": {
  "react-0.13.3.js",
  ...
},
...
```

Next, we need to tell Truffle how to process CSJX files, so if it finds one in any build target it knows what to do. First create a file within your project called `cjsx.js` (we'll put ours in a `./lib` directory), then add the following code. In it, we tell Truffle to use `coffee-react-transform` on the file's contents and then send the result back down to the default CoffeeScript processor:

```javascript
var transform = require('coffee-react-transform');

module.exports = function(contents, file, config, process, callback) {
  try {
    config.processors['.coffee'](transform(contents), file, config, process callback);
  } catch(e) {
    callback(e);
  }
};
```

In Truffle parlance, the above is dubbed a "processor". Processors are modules that take five parameters:

* `contents`: The contents of the file to process. 
* `file`: Full path of the file being processed. This is a *dummy* path, in that you should only use it for error messages or to inform your processor of where to look for other files. Since processors can be chained, you should only process the `contents` value passed in.
* `config`: Truffle config object. Contains a lot of information about the current project, but the most important value is `config.working_dir` -- this is the base directory of the current project.
* `process`: Function you can use to process other files based on their extension. Its signature is: `process(config, files, base_path=null, separator="\n\n", callback)`. `files` can be a single file (string), and both `base_path` and `separator` are optional. 
* `callback`: Function to call when the processor is finished. Signature is `callback(err, processed)`, where processed is the final result.

The last thing to do is register the processor in the pipeline. In `app.json`, add the following attribute to the main object:

```
"processors": {
  ".cjsx": "./lib/cjsx.js"
}
```

Now Truffle knows how to process any CJSX file. **Caution:** Since your CJSX processor lives within your project's directory, you'll need to make sure you've added `coffee-react-transform` to your project's `package.json` and the `coffee-react-transform` node module.

##### Example: Custom Post-processing

You have a lot of control over what Truffle can do. So far you've only seen processors that are based on file extensions; however, you can add *named* processors that take effect once preprocessing is completed. 

By default, Truffle looks for the `app.js` build target and if it finds it, performs the following post-processing:

* `inject-contracts`: Inserts usable contract abstractions into the build.
* `frontend-dependencies`: Inserts dependencies ([web3](https://github.com/ethereum/web3.js), Promise via [bluebird](https://github.com/petkaantonov/bluebird), and [ether-pudding](https://github.com/ConsenSys/ether-pudding)) needed by those contracts.
* `uglify`: Minify Javascript. Only called when `truffle dist` is run.

Each of these named processors looks like the processor example above.

You have complete control over this post processing in your `app.json` file, and a configuration for the default behavior above would look like this:

```
"build": {
  "app.js": {
    "files": [
      // list of files to process...
    ],
    "post-process": {
      "build": [
        "inject-contracts",
        "frontend-dependencies"
      ],
      "dist": [
        "inject-contracts",
        "frontend-dependencies",
        "uglify"
      ]
    }
  }
}
```

Note that in this example we specify different post processing behavior for when `truffle build` is run versus `truffle dist`. 

If you don't want any post processing on `app.js`, simply make `post-process` an empty object. `post-process` can also be an array of named processors, and that post-processing configuration will be applied to both `truffle build` and `truffle dist`.

Adding a custom named processor is exactly the same as adding an extension-based processor, except that you don't add a `.` in front of its name in the processors list:

```
"processors": {
  "my-named-processor": "path/to/some/processor.js"
}
```

### Contributors

[@tcoulter](https://github.com/tcoulter) - original author

### License

MIT




