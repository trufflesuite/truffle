# Truffle

Truffle is a development environment, testing framework and asset pipeline for Ethereum, aiming to make life as an Ethereum developer easier. With Truffle, you get:

* Quick contract compilation and deployment to the Ethereum network on any RPC client, with no extra code.
* Automated contract testing with Mocha and Chai.
* Helpers for creating new contracts and tests (think, `rails generate`)
* An extensible and configurable pipeline that’s not married to a particular frontend or architecture.
* Instant rebuilding of assets as they change (see the `watch` command)

Truffle shares many similarities to the [Embark Framework](https://iurimatias.github.io/embark-framework/) but differs in philosophy. The main development goals of Truffle are: 

* **Flat Files:** App deployment isn’t tied to IPFS or Swarm. Truffle aims to support any deployment platform, and it does so by compiling frontend code down to processed HTML, CSS and Javascript. 

* **Configurable Frontend:** Frontend code architecuture is completely configurable, and can be changed to fit your needs (see examples below).

* **Programmable Pipeline:** Want to use a file type that’s not currently supported by Truffle? For instance, React + JSX? Or Babel for ES6 JS? Easy. See the “Extending the Pipeline” section below.

* **The RPC is King:** The application and tests all use the RPC to communicate with the network. This gives you assurance your app will work for your users, and the ability to test your app across many different Ethereum clients without writing a drop of new code.

* **Use Any Ethereum Client:** Use any RPC client either in develpoment or testing. Pro tip: If you want to do things faster, we suggest the [TestRPC](https://github.com/ConsenSys/testrpc).

* **No Stubbing:** Truffle tests interact with *real* contracts on *real* networks. Contracts aren’t stubbed, so you know you’re getting real results.

### Installation

`npm install -g truffle`

### Usage & Available Commands:

```
Usage: truffle [command] [options]

build           => Build development version of app; creates ./build directory
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
$ truffle build
$ truffle test

  Contract: Example
    ✓ should assert true

  1 passing (5ms)

```

The above will initialize a new Ethereum application with an example contract and an example test. Then it will build that application’s frontend and run the test.

### dApp Structure

```
app/...                      # Frontend code. See "App Configuration", below.
contracts/                   # Solidity contracts
config/
    |___ app.json            # App configuration (frontend, rpc, deployed contracts, etc.)
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

Truffle infers your app configuration by first reading `./config/app.json`, and then overriding those values with the `config.json` of your current environment. If none is specified, the **default environment** is **development**. In this sense, `app.json` acts as a base configuration that your current environment can then modify. 

Your `app.json` file and environment configuration files (collectively, `config.json`) make up your app’s configuration. They expect three main values to be set:

* `frontend`
* `deploy`, and
* `rpc`

The configuration you’re given out of the box looks like this:

```javascript
{
  "frontend": {
    // Copy ./app/index.html (right hand side) to ./build/index.html.
    "index.html": "index.html",
    "app.js": [
      // Paths relative to "app" directory that should be
      // concatenated and processed during build.
      "javascripts/app.coffee" 
    ],
    "app.css": [
      // Paths relative to "app" directory that should be
      // concatenated and processed during build.
      "stylesheets/app.scss"
    ]
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

Let's look at the three main objects, starting with `rpc`.

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

##### Frontend Configuration

Truffle allows you to have a completely configurable frontend file structure so you’re not forced to organize your files in any specific way. Though you have a lot of power, we'll only mention the basics here. See the section below about Extending the Pipeline for more details.

The default frontend configuration looks like this:

```javascript
"frontend": {
  // Copy ./app/index.html (right hand side) to ./<build or dist>/index.html.
  "index.html": "index.html",
  "app.js": [
    // Paths relative to "app" directory that should be
    // concatenated and processed during build.
    "javascripts/app.coffee" 
  ],
  "app.css": [
    // Paths relative to "app" directory that should be
    // concatenated and processed during build.
    "stylesheets/app.scss"
  ]
}
```

The `frontend` configuration allows for any number of key/value pairs, called "targets". Each target has a file name as a key and an array of paths as the value. The key specifies the resultant file that the array of paths will be compiled down into. The paths relative to the `./app` directory, and based on the file extension will be sent through specific preprocessors. The only preprocessors that are shipped by default with Truffle are `.coffee` (turning CoffeeScript files into Javascript) and `.scss` (turning SCSS files into CSS). **You're not required to use CoffeeScript and SCSS**, however.

Some files go through post-processing after the array of files are preprocessed. `app.js` is considered special to Truffle: If given, Truffle will inject your contracts and a few dependencies (like `web3`) so they're automatically made available to you on the frontend. You can remove this post-processing step, however, if desired. See the Extending the Pipeline section below. 

**Note:** All JSON files in Truffle allow Javascript comments which are ignored by our JSON parser. This is non-standard JSON syntax, and should be removed if its causing you issue.

### Building & Distributing Your App

Truffle uses the term “build” to mean compiling your assets into an executable app -- i.e., sending your assets through the pipeline to produce raw HTML, CSS and Javascript. Building is easy. Simply run:

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

This will create another version of your app with the Javascript minified in the `./dist` directory. 

If you're using the default `app.json` configuration, you'll notice that the structure of the `./build` and `./dist` directories represent the targets specified in the `frontend` configuration:

```
build/
    |___ app.js      # Compiled Javascript
    |___ app.css     # Compiled CSS
    |___ index.html  # Main index file.
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

```
deployed = MyCoin.at(MyCoin.deployed_address)
```

### Testing Contracts

Truffle standardizes on [Mocha](http://mochajs.org/) for running tests and [Chai](http://chaijs.com/) for assertions. By default, Truffle uses the `assert` style of assertions provided by Chai, but you’re not prevented from using other styles. An example test for a coin-like contract looks like this: 

```coffeescript
contract 'MyCoin', (accounts) ->

  it "should give me 20000 coins on contract creation", (done) -> 
    coin = MyCoin.at(MyCoin.deployed_address)
    coin.balances.call().then (my_balance) ->
      assert.isTrue(20000, my_balance, "I was not given 20000 on contract creation!")
      done()
    .catch done   
```

To run this test, simply type:

```
$ truffle test
Tims-MacBook-Pro:test tim$ truffle test

  Contract: MyCoin
    ✓ should give me 20000 coins on contract creation

  1 passing (4ms)
```

Note that in your tests, your contract classes are created for you, and are globally accessible (e.g., `MyCoin`). Similarly, `web3` is already included and the default provider has already been set based on your environment’s RPC configuration.  Note that the `contract` function is synonymous for Mocha’s `describe`, except that it provides better output.

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

##### compile

Compile your contracts. This will only compile and display compile errors if there are any. It does not modify any project state or deploy to the network. The `compile` command uses the RPC to compile contracts, so you need to make sure your RPC client is capable of compiling your desired contract language.

```
$ truffle compile
```

Optional parameter:

* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### create:contract

Helper method to scaffold a new contract. `--name` paramter is required. Name must be camel-case.

```
$ truffle create:contract --name=“MyContract”
```

##### create:test

Helper method to scaffold a new test for a contract. `--name` paramter is required. Name must be camel-case.

```
$ truffle create:test --name=“MyContract”
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

* `-e environment`: Specify the environment. Default is "development".

When building, if a build target of `app.js` is specified, Truffle will include the environment's contracts as a dependency.

##### exec

Execute a Javascript or CoffeeScript file within the Truffle environment. This will include `web3`, set the default provider based on the app configuration, and include the environment's contracts within the specified script. **This is a limited function.** Your script **must** call process.exit() when it is finished or `truffle exec` will never exit. The `--file` parameter is required.

```
$ truffle exec --file="/path/to/my/script.js"
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

Optional parameter:

* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### version

Show version number and exit.

```
$ truffle version
```

##### watch

Watch for changes to contracts, frontend and configuration files. When there's a change, rebuild the app using `truffle build`.

```
$ truffle watch
```

### Extending the Pipeline: Integrating ReactJS & CJSX (example)

Though Truffle comes built-in with CoffeeScript and SCSS support for the frontend, you may want to use something fancier. Here we’ll show you an example of how to integrate ReactJS, not only using it in the app but including CJSX (CoffeeScript + JSX) files within the pipeline.

First, download [ReactJS](https://fb.me/react-0.13.3.js) and add it to your `app.json`:

```
"javascripts": {
  "react-0.13.3.js",
  ...
},
...
```

From here, React would technically be included in your application, but you couldn’t include CJSX files within the configuration as Truffle wouldn’t know how to process those files. To tell Truffle how to use it, you need to create a “processor” that converts CJSX files to Javascript. Suppose we created a directory called “lib” within our app and added to it the following file -- let's call it `cjsx.coffee`:

```
transform = require 'coffee-react-transform'

module.exports = (contents, config, callback) ->
  try 
    config.processors.coffee(transform(contents), config, callback)
  catch e
    callback e
```

Note that we “string together” processors by passing the results of react transform down to the coffee processor. 

The last thing to do is to register that processor in the pipeline. That’s easy! Back in app.json, add the following attribute to the main object:

```
"processors": {
  ".cjsx": "./lib/cjsx.coffee"
}
```

You can then add `cjsx` files into the Javsacripts pipeline as you would any other file. Of course, make sure to add `coffee-react-transform` into your app’s `package.json` and run `npm install` within your app so Truffle can find the correct dependencies. 