# Truffle

Truffle is a development environment, testing framework and asset pipeline for Ethereum, aiming to make life as an Ethereum developer easier. With Truffle, you get:

* Quick contract compilation and deployment to the Ethereum network on any RPC client, with no extra code.
* Automated contract testing with Mocha and Chai.
* Helpers for creating new contracts and tests (think, `rails generate`)
* An asset pipeline that automatically builds your assets into a minified, distributable app. 
* Instant rebuilding of assets as they change (see the `watch` command)

Truffle shares many similarities to the [Embark Framework](https://iurimatias.github.io/embark-framework/) but differs in philosophy. The main development goals of Truffle are: 

* **Flat Files:** App deployment isn’t tied to IPFS or Swarm. Truffle aims to support any deployment platform, and it does so by compiling frontend code down to processed HTML, CSS and Javascript. 

* **Single-Page Apps:** Though not specifically required, Ethereum and the Truffle framework lend themselves nicely to single-page app development. We highly suggest you do this, but it’s not required. 

* **Programmable Pipeline:** Want to use a type of file that’s not currently supported by Truffle? That’s easy. See our React and CJSX (coffee-JSX) integration below.

* **The RPC is King:** The application and tests all use the RPC to communicate with the network. This gives you assurance your app will work for your users, and the ability to test your app across many different Ethereum clients without writing a drop of new code.

* **Works With Any Ethereum Client:** Use any RPC client either in develpoment or testing. Pro tip: If you want to do things faster, we suggest the [TestRPC](https://github.com/ConsenSys/testrpc).

* **No Stubbing:** Truffle tests interact with *real* contracts on *real* networks. Contracts aren’t stubbed, so you know you’re getting real results.

### Installation

`npm install -g truffle`

### Available Commands:

```
build           => Build development version of app; creates ./build directory
compile         => Compile contracts
create:contract => Create a basic contract
create:test     => Create a basic test
deploy          => Deploy contracts to the network
dist            => Create distributable version of app (minified); creates ./dist directory
init            => Initialize new Ethereum project, including example contracts and tests
init:config     => Initialize default project configuration
init:contracts  => Initialize default contracts directory
init:tests      => Initialize tests directory structure and helpers
list            => List all available tasks
test            => Run tests
version         => Show version number and exit
watch           => Watch project for changes and rebuild app automatically
```

### Example

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
app/
    |___ assets/
    |___ javascripts/
    |___ stylesheets/
    |___ contracts/          # Solidity contracts
    |___ index.html          # Main file.
config/
    |___ app.json            # App configuration (rpc, deployed contracts, etc.)
    |___ development/        # Environment directory (development)
        |___ config.json     # Environment configuration (overrides app.json)
        |___ contracts.json  # Contract configuration (built during contract deployment)
    |___ staging/...         # Other environments. Can be renamed/deleted. 
    |___ production/...
    |___ test/...              
test/                        # Mocha tests
build/                       # Built app (created by `truffle build`)
dist/                        # Built and minified app (created by `truffle dist`) 
```

### Environments / App Configuration

Truffle infers your app configuration by first reading `./config/app.json`, and then overriding any values it finds there with the `config.json` of your assocated environment.

The **default environment** is `development`. Truffle supports reading the environment through the `NODE_ENV` environment variable (used by many other node-based apps) as well as through the optional `-e` parameter:

```
$ truffle deploy -e production
```  

Your apps configuration should provide the following values:

```
{
  "javascripts": [
    // Paths relative to "javascripts" directory that should be
    // concatenated during build, and minified during distribution.
    "app.coffee"
  ],
  "stylesheets": [
    // Paths relative to "stylesheets" directory that should be
    // concatenated during build, and minified during distribution.
    "app.scss"
  ],
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

By default, truffle expects the RPC host and port to be `localhost` and `8545`, respectively. However, we recommend you overwrite this for each environment configuration. For instance, you might develop on an RPC client local to your computer, but you might want to deploy contracts to a different RPC client when you want to deploy your contracts to the main network.

We recommend the configuration files in `./config/development` not be committed to your app’s code repsitory.  

**Note:** All JSON files in Truffle allow Javascript comments which are ignored by our JSON parser. This is non-standard JSON syntax, and should be removed if its causing you issue.

### Building / Distributing Your App

Truffle uses the term “build” to mean compiling your assets into an executable app -- i.e., raw HTML, CSS and Javascript. To do this, simply run:

```
$ truffle build
```

This will create a new, non-minified version of the app. To run it, open `./build/index.html` in your browser.

Running `truffle build` can get cumbersome, however, as you’d have to do so after every change. Fortunately, Truffle can watch for changes and do this automatically for you:

```
$ truffle watch
Waiting...
```

This will automatically rebuild your app as files within the `./app` or `./config` directory change. Using `truffle watch`, development feels like traditional web development, where all that’s required is a refresh.

When you’re ready to create a version of your app ready for distribution, simply run:

```
$ truffle dist
```

This will create another version of your app with the Javascript minified in the `./dist` directory. The file structure of both the `./build` directory and the `./dist` directory looks like this:

```
build/
    |___ assets/     # Copied assets
    |___ app.js      # Compiled Javascript
    |___ app.css     # Compiled CSS
    |___ index.html  # Main index file.
```

Notice that the Javascript and CSS files listed in `app.json` have compiled down to a single `app.js` and `app.css` file, respectively. Your assets directory was copied over directly.

We recommend you ignore committing the `./build` directory in your code repository as it’s only used for development. However, we strongly recommend the `./dist` be included as it represents last good distributable version of the app. 

### Interacting With Contracts

Truffle apps use [Pudding](https://github.com/ConsenSys/ether-pudding) under the hood. This allows for easy control flow within your app and tests while still giving you the standard contract abstraction provided by `web3`. 

### Testing Contracts

Truffle standardizes on [Mocha](http://mochajs.org/) for running tests and [Chai](http://chaijs.com/) for assertions. By default, Truffle uses the `assert` style of assertions provided by chai, but you’re not prevented from using other styles. An example test for a coin-like contract looks like this: 

```coffeescript
contract 'MyCoin', (addresses, accounts) ->

  it "should give me 20000 coins on contract creation", (done) -> 
    coin = MyCoin.at(addresses["MyCoin"])
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

Currently, every test run deploys a new set of contracts to the network. Given the current functionality, you shouldn’t run tests within a different environment (e.g., production) as it’ll overwrite your production contract configuration during testing.

### Command Parameters

Many commands read everything they need from your app configuration. However, some require (or, optionally provide) additional parameters. Those commands are listed here:  

##### create:contract

Takes an optional `--name` parameter that will create new contract with that name. Name is expected to be camel-case. New contract is placed in the `./app/contracts` directory.

```
$ truffle create:contracts --name=“MyContract”
```

##### create:test

Takes an optional `--name` parameter that will create new test with that name, and expect a contract of the same name. Name is expected to be camel-case. New test is placed in the `./test` directory.

```
$ truffle create:contracts --name=“MyContract”
```

##### test

Takes an optional parameter of `--no-color` if you want to prevent the test output from displaying color information (such as when run outside of a terminal). 




