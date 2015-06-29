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

* **Works With Any RPC Client:** Use any RPC client either in develpoment or testing. Pro tip: If you want to do things faster, we suggest the [TestRPC](https://github.com/ConsenSys/testrpc).

* **No Stubbing:** Truffle tests interact with *real* contracts on *real* networks. Contracts aren’t stubbed, so you know you’re getting real results.


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
    |___ development/        # Environement directory
        |___ config.json     # Environment configurations (overrides app.json)
        |___ contracts.json  # Contract configuration (built during contract deployment)
    |___ staging/...         # Other environments. Can be renamed/deleted. 
    |___ production/...
    |___ test/...              
test/                        # Mocha tests
build/                       # Built app (created by `truffle build`)
dist/                        # Built and minified app (created by `truffle dist`) 
```


