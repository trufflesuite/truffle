cfxtruffle ultimate tutorial
===

Truffle is a world class Ethereum development environment that makes Solidity smart contract development, compilation, testing and deployment easier. Conflux is a new secure and reliable public blockchain with very high performance and scalability. Conflux’s contract VM is compatible with EVM, so developers can develop applications without the need to learn a new programming language. To improve the development experience of Conflux smart contract, we have ported truffle to the Conflux Network as [Conflux-Truffle](https://www.npmjs.com/package/conflux-truffle). In this article, we will introduce how to develop Conflux smart contracts using Conflux Truffle, including creating projects, developing, compiling, testing and deploying.

1. Introduction
2. Dependencies Preparation
3. Develop Conflux Smart Contract Using cfxtruffle
4. References


## Introduction
The blockchain world is decentralized where all participating nodes are equal and have the same data. The organization of data on the blockchain is: several transactions are packaged together to form a block, and then the blocks are linked according to the sequence to form a chain, hence blockchain. The first blockchain, Bitcoin, only supports transfers. As the second generation, Ethereum has pioneered the EVM - a Turing complete virtual machine, so various decentralized applications (DApps) can be developed on it.

### Epoch & storageLimit
The traditional blockchain ledgers are a single chain, and each block has a block number according to the sequence. To realize high throughput with low latency, Conflux has developed a new ledger structure - Tree-Graph.

![](https://developer.conflux-chain.org/img/tree_graph.jpg)

By only looking at the parent edge, it is a tree, and it becomes a graph if both parent and reference edges are included - hence the name Tree-Graph. The structure enables the Conflux network to generate blocks concurrently. In other words, multiple blocks can be generated following one same block, and there are no unique block numbers on the Conflux network. In order to sequence the blocks, the GHAST rule is used to choose the heaviest child block as the pivot block. All pivot blocks linked together form a chain, which is the pivot chain which is similar to traditional chains. Based on a pivot block, an epoch is defined. The epoch here is the parallel to the block number of traditional chains, but the difference is that one epoch may contain several blocks.

In the real world, a transfer or transaction requires a fee to pay the bank. On Bitcoin and Ethereum, sending a transaction requires a fee to pay the miner. Specifically, transactions on the Ethereum network are ultimately executed by the EVM run by miners. Gas is used to measure the amount of work performed by a transaction (which can be understood as work hours). The sender of the transaction can specify the gasPrice, which is the amount he/she is willing to pay for each unit of workload (gas). So, the final transaction fee is gas * gasPrice. The gas specified when sending a transaction is a limit, which is the most gas the sender is willing to pay for the transaction. If the workload required by the transaction exceeds the gas, no more money will be paid, and the transaction will not be executed.

In the DApp system, transaction execution requires computing resources of miners to perform calculations as well as storage resources to store the contract state. When sending a transaction in the Conflux system, senders also need to deposit a fee for state storage. Therefore, compared with Ethereum, transactions in the Conflux network need one more parameter - storageLimit, which is used to set the upper limit of the fee that the sender is willing to pay for storage deposit in a transaction. After the contract releases the used storage space, the deposited fee will be refunded.

### Dapp
For traditional apps, data and states are stored in the centralized databases and servers. Queries and modifications are performed directly in the database by executing SQL operations through an API. Although it is fast, there are problems such as casual data tampering and privacy leakage. Decentralized applications (DApps) are applications that run on blockchain systems. The application’s states are stored on the blockchain. States of the DApp must be queried through the network, and can only be changed by sending transactions.

![](https://github.com/Pana/conflux-101/raw/master/docs/conflux-truffle/traditional-vs-dapp.jpg)

### Wallet
In traditional applications, services are accessed through accounts, and the data is ultimately stored on the server of the service provider. For blockchains, all transactions in the blockchain need to be implemented through wallets such as MetaMask for Ethereum and Conflux Portal. In the wallet, users can check balances, send transactions, interact with DApps, and get testnet tokens. A wallet stores a user’s private key to securely sign and send transactions in the blockchain world. The private key should only be kept secret and never be shared with anyone else.

## Dependencies Preparation
Before developing smart contracts, the development environment needs to be set up.

### NPM
npm is a package manager for node.js packages. cfxtruffle is developed using node, so npm is needed. npm is included in the install-package of node.  node and npm can be downloaded via the [official](https://nodejs.org/en/) node install-package or through [nvm](https://github.com/nvm-sh/nvm). After installation, tge node and nvm version can be checked with the following command:

```sh
$ node -v
$ npm -v
```

### cfxtruffle
After npm is installed successfully, cfxtruffle can be installed.
```sh
$ npm install -g conflux-truffle
# After the installation, you can use the following command to test
$ cfxtruffle -v
```

There are two things to note:
1. When installing npm, please specify global installation with -g command.
2. The name of the npm install-package is conflux-truffle, and the command line program after installation is cfxtruffle

### conflux-rust docker
A local node is needed to debug the development contract. The simplest way to run conflux is to use docker to run the [conflux-rust](https://hub.docker.com/repository/docker/confluxchain/conflux-rust) image. In this way, users do not need to compile the program and prepare the configuration file themselves as long as the docker environment is installed.


```sh
# pull image
$ docker pull confluxchain/conflux-rust
# fast run a single node local chain
$ docker run -p 12537:12537 --name cfx-node confluxchain/conflux-rust
```
With a single command, a local Conflux node will start up, and have 10 local genesis accounts with 1000 CFX (the accounts will be automatically unlocked). After the conflux-rust image is started, cfxtruffle can directly use it to deploy contracts and interact with contracts.

For more customization, users can also compile or download the node program, customize the configuration file, and then run the local node. For details, see [this document](https://github.com/Pana/conflux-101/blob/master/docs/how-to-run-a-local-independent-node.md). However, if users want to use it with cfxtruffle with a custom setup, several accounts need to be prepared with CFX balance and manually unlocked.


Note:
1. Local accounts can be created using the node command line (conflux account new) or local rpc. Local accounts can be accessed by the node program and directly used for transaction signing.
2. Local accounts can send transactions directly through `cfx_sendTransaction`. The signature operation of the transaction is completed by the node without prior signature, so it is very convenient to develop DApps locally.
3. For security, local accounts need to be unlocked to send transactions directly. Users can pass the password through the second parameter when calling `cfx_sendTransaction`, or users can call unlock rpc in advance to unlock the account.
4. Currently, the cfxtruffle needs to run with the conflux-rust image version 0.6.0 or higher.


### conflux portal
[Conflux portal](https://portal.conflux-chain.org/) is a browser extension wallet that supports browsers such as Chrome and Firefox. Click to download and install (a VPN service may be needed to access).

![](https://github.com/Pana/conflux-101/raw/master/docs/conflux-truffle/portal-home.png)

Users can switch between different Conflux networks or to a localhost. Every account can apply for testnet tokens that can be used for deploying after local testing.

## Develop Conflux Smart Contract Using cfxtruffle
After the environment is ready, cfxtruffle can be used to develop smart contracts. cfxtruffle can be used to develop a coin contract with coin minting and transfer functions.

Look at the commands of cfxtruffle:
```sh
$ cfxtruffle -h
Usage: cfxtruffle <command> [options]

Commands:
  compile   Compile contract source files
  config    Set user-level configuration options
  console   Run a console with contract abstractions and commands available
  create    Helper to create new contracts, migrations and tests
  debug     Interactively debug any transaction on the blockchain
  deploy    (alias for migrate)
  exec      Execute a JS module within this Conflux-Truffle environment
  help      List all commands or provide information about a specific command
  init      Initialize new and empty Conflux project
  install   Install a package from the Conflux Package Registry
  migrate   Run migrations to deploy contracts
  networks  Show addresses for deployed contracts on each network
  obtain    Fetch and cache a specified compiler
  opcode    Print the compiled opcodes for a given contract
  publish   Publish a package to the Conflux Package Registry
  run       Run a third-party command
  test      Run JavaScript and Solidity tests
  unbox     Download a Conflux-Truffle Box, a pre-built Conflux-Truffle project
  version   Show version number and exit
  watch     Watch filesystem for changes and rebuild the project automatically

See more at http://truffleframework.com/docs
```

More details for a specific command can be found using help:
```sh
$ cfxtruffle help create
```

### Create Projects

First, create a basic cfxtruffle project:

```sh
# create an empty project
$ cfxtruffle init project-name
# view the directory structure of the project
$ cd project-name && tree
.
├── contracts
│   └── Migrations.sol
├── migrations
│   └── 1_initial_migration.js
├── test
└── truffle-config.js

3 directories, 3 files
```

A cfxtruffle project will include these folders:
* `contracts` solidity code
* `migrations` migration script
* `test` testing file
* `truffle-config.js`  cfxtruffle config file (js file)

In addition, cfxtruffle provides many complete project templates (boxes) or scaffolding. Developers can omit a lot of initialization work using templates:

```sh
$ mkdir project-name && cd project-name
$ cfxtruffle unbox metacoin
```

See the official [box](https://www.trufflesuite.com/boxes) list to find a starting template and frameworks.

Note: Chinese users may need VPN to execute the two commands.

### Create New Contracts
The init command can only create an empty project which contains a basic Migrations contract and its migration script. New files must be added to develop a new contract. The `create` command can be used to create all files related to a contract, including contract source code (contract), deploy script (migration), and test script (test). The method is: `cfxtruffle create <artifact_type> <ArtifactName>`

Now create the source code file of the Coin contract.
```sh
$ cfxtruffle create contract Coin
```
After the above command is executed, a Coin.sol file will be created in the contracts directory, where we can write solidity code. The following is the solidity of the Coin contract, which implements the functions of coin minting, transfer, and balance inquiry.

```js
pragma solidity ^0.5.10;

contract Coin {
    // An `address` is comparable to an email address - it's used to identify an account on Ethereum.
    // Addresses can represent a smart contract or an external (user) accounts.
    // Learn more: https://solidity.readthedocs.io/en/v0.5.10/types.html#address
    address public owner;

    // A `mapping` is essentially a hash table data structure.
    // This `mapping` assigns an unsigned integer (the token balance) to an address (the token holder).
    // Learn more: https://solidity.readthedocs.io/en/v0.5.10/types.html#mapping-types
    mapping (address => uint) public balances;

    // Events allow for logging of activity on the blockchain.
    // Ethereum clients can listen for events in order to react to contract state changes.
    // Learn more: https://solidity.readthedocs.io/en/v0.5.10/contracts.html#events
    event Transfer(address from, address to, uint amount);

    // Initializes the contract's data, setting the `owner`
    // to the address of the contract creator.
    constructor() public {
        // All smart contracts rely on external transactions to trigger its functions.
        // `msg` is a global variable that includes relevant data on the given transaction,
        // such as the address of the sender and the ETH value included in the transaction.
        // Learn more: https://solidity.readthedocs.io/en/v0.5.10/units-and-global-variables.html#block-and-transaction-properties
        owner = msg.sender;
    }

    // Creates an amount of new tokens and sends them to an address.
    function mint(address receiver, uint amount) public {
        // `require` is a control structure used to enforce certain conditions.
        // If a `require` statement evaluates to `false`, an exception is triggered,
        // which reverts all changes made to the state during the current call.
        // Learn more: https://solidity.readthedocs.io/en/v0.5.10/control-structures.html#error-handling-assert-require-revert-and-exceptions

        // Only the contract owner can call this function
        require(msg.sender == owner, "You are not the owner.");

        // Ensures a maximum amount of tokens
        require(amount < 1e60, "Maximum issuance succeeded");

        // Increases the balance of `receiver` by `amount`
        balances[receiver] += amount;
    }

    // Sends an amount of existing tokens from any caller to an address.
    function transfer(address receiver, uint amount) public {
        // The sender must have enough tokens to send
        require(amount <= balances[msg.sender], "Insufficient balance.");

        // Adjusts token balances of the two addresses
        balances[msg.sender] -= amount;
        balances[receiver] += amount;

        // Emits the event defined earlier
        emit Transfer(msg.sender, receiver, amount);
    }
}
```

The properties and methods of the contract are as follows:

1. Owner properties: contract owner. Only the contract owner can perform minting operations. The owner has public property, so a corresponding method will be automatically created to query the contract owner.
2. Balance properties: Balance, map type, used to store the balance information of the account.
3. Constructor method: this method will only be executed once when the contract is created, and will not be executed afterwards. It is mainly used to set the initial status of the contract
4. Mint method: minting coins. Users can mint a certain amount of coins for an address.
5. Transfer method: transfer money to another account.
6. Transfer event: whenever a transfer operation occurs, this event will be triggered.


### compile
Solidity is a high-level language that has syntax that refers to C++, python and JS, but solidity cannot be deployed directly and needs compilation first. It is similar to C++ programs which need to be compiled into binary programs to execute. `Solc`, the compiler of solidity, can be installed and used separately, but the `compile` function is integrated in cfxtruffle and can be used directly.


```sh
# compile contract
$ cfxtruffle compile
# When executed for the first time, a build directory will be created, and all the compiled stuff will be saved in the json file in the directory.
```
After compilation, bytecode and abi (Application Binary Interface, the external interface of the contract) will be generated, both of which will be used during deployment. The json file generated by cfxtruffle contains the bytecode, abi, ast, name and other information of the contract. It will be used in the following deployment and debugging steps.


### truffle-config.js

`truffle-config.js` is the configuration file of the project. It is very important. Many commands of cfxtruffle will use the configuration in it.

```js
module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 12537,            // Standard Conflux port (default: none)
     network_id: "*",       // Any network (default: none)
    },
  },
}
```
The most important configuration item is networks, which is used to configure the network for cfxtruffle deployment interaction. The development network is used by default. In addition, users can also configure information such as test and compiler. For more details, please refer to the [official docs](https://www.trufflesuite.com/docs/truffle/reference/configuration)

### Local Deploy Contract

When developing a contract, it will be deployed and tested on the local node first. The started node can be used for local deployment and testing. The `migrate` command in cfxtruffle is mainly used for contract deployment (deploy is an alias to migrate). The `migrations` folder is used to store migration scripts. The scripts manage the deployment of contracts. Usually, each contract corresponds to a migration script. When the cfxtruffle project is created, a `Migrations.sol` contract and its corresponding migration script will be generated. This contract is mainly used to record the deployment serial number (integer serial number) of the contract on the chain. Every time the migrate command is executed, it will query the location of the last deployment on the chain, and then determine whether there is a new contract to be deployed.


The `Migrations.sol` contract code is as follows：
```js
// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.7.0;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  constructor() public {
    owner = msg.sender;
  }

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
```
Now the create command is used to add a deployment script for the Coin contract

```sh
$ cfxtruffle create migration Coin
# The generated migration script file name will contain a timestamp number, you need to manually change it to an incremental serial number such as 2_coin.js
```

Then add the following code in it:
```js
// require the Coin artifact
const Coin = artifacts.require("Coin")
module.exports = function(deployer) {
  // when `deploy` command run, will execute code here
  deployer.deploy(Coin);
};
```

After setup, the deployment command can be run
```sh
$ cfxtruffle deploy
...
...
2_coin.js
=========

   Deploying 'Coin'
   ----------------
   > transaction hash:    0xd001fb34df8e634e21d7d225bfd0da6128237cd74f170fbc97ad820098ceaeff
   > Blocks: 0            Seconds: 0
   > contract address:    0x8DCe85c454d401318C03956529674b9E2B8E8680
   > block number:        1608
   > block timestamp:     1595475207
   > account:             0x1357DA1577f40EE27aE8870C7f582bD345C65A1c
   > balance:             997.71313608
   > gas used:            437390 (0x6ac8e)
   > gas price:           20 GDrip
   > value sent:          0 CFX
   > total cost:          0.0087478 CFX


   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:           0.0087478 CFX


Summary
=======
> Total deployments:   2
> Final cost:          0.01221746 CFX
```

After the deploy command is executed, the deployment result will be output, such as transaction hash, contract address, cost, etc.

### Interact with Contract
To interact with the deployed contract, such as querying the status, initiating a transfer, etc, cfxtruffle contains the console command. The console command opens an interactive command line environment and conveniently provides the contract JS object, account list, and js-conflux-sdk instance and util. Users can instantiate the contract object in it, and then interact with the contract through the instance object, such as querying status, changing balance, etc. The following is an example of interacting with the Coin contract:

```sh
$ cfxtruffle console
cfxtruffle(development)> .help  # view help
cfxtruffle(development)> Object.keys(global) # viewconsole environment, available global object:  accounts, cfx, cfxutil, Coin, Migrations
# instantiate a coin contract, call the deployed() method of the contract object
cfxtruffle(development)> let coin = await Coin.deployed()
# view the owner of the contract
cfxtruffle(development)> let owner = await coin.owner()
cfxtruffle(development)> owner
'0x1357DA1577f40EE27aE8870C7f582bD345C65A1c'
# view all the available accounts
cfxtruffle(development)> accounts
[
  '0x1357DA1577f40EE27aE8870C7f582bD345C65A1c',
  '0x148A9696F8DCf4d6cB01eC80F1047a3476bA5C56',
  '0x1f69a930B6A4F2BC5Ac03B79A88af9f6bBa0d137'
]
# query balance
cfxtruffle(development)> let balance = await coin.balances('0x1357DA1577f40EE27aE8870C7f582bD345C65A1c')
cfxtruffle(development)> balance.toString()
# mint new coins
cfxtruffle(development)> await coin.mint('0x1357DA1577f40EE27aE8870C7f582bD345C65A1c', 10000)
cfxtruffle(development)> balance = await coin.balances('0x1357DA1577f40EE27aE8870C7f582bD345C65A1c')
cfxtruffle(development)> balance.toString()
'10000'
# transfer
cfxtruffle(development)> await coin.transfer('0x148A9696F8DCf4d6cB01eC80F1047a3476bA5C56', 100)
cfxtruffle(development)> balance = await coin.balances('0x1357DA1577f40EE27aE8870C7f582bD345C65A1c')
cfxtruffle(development)> balance.toString()
'9900'
# specify the gasPrice of the transaction
cfxtruffle(development)> await coin.transfer('0x148A9696F8DCf4d6cB01eC80F1047a3476bA5C56', 100, {gasPrice: '0x100'})
# the integrated cfx object is a js-conlfux-sdk instance
cfxtruffle(development)> await cfx.getBalance('0x148A9696F8DCf4d6cB01eC80F1047a3476bA5C56')
cfxtruffle(development)> await cfx.getNextNonce("0xbbd9e9be525ab967e633bcdaeac8bd5723ed4d6b")
# cfxutil
cfxtruffle(development)> let drip = cfxutil.unit.fromCFXToGDrip(0.1)
cfxtruffle(development)> let randomKey = cfxutil.sign.randomPrivateKey()
# 
cfxtruffle(development)> .exit
```
* In addition, users can also deploy a new contract in the console, instantiate a contract with a specified address and estimateGas, etc. For detailed interaction methods of the contract, please refer to [this document](https://www.trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts)
* And in the console, users can directly execute cfxtruffle commands, such as [networks, compile](https://www.trufflesuite.com/docs/truffle/getting-started/using-truffle-develop-and-the-console) etc.
* Note: currently cfxtruffle does not support the develop command.

### Contract Testing
cfxtruffle has a built-in JS testing framework (Mocha & Chai) for solidity tests. All test codes are located in the test folder. Next, use the create command to create a test file.
```js
$ cfxtruffle create test Coin
```

Then add the following code in it:
```js
const Coin = artifacts.require("Coin");
// Note: use contract instead of describe here
contract("Coin", function(accounts) {
  it("should assert true", async function() {
    let instance = await Coin.deployed();
    await instance.mint(accounts[0], 10000)
    let balance = await instance.balances(accounts[0]);
    assert.equal(balance.toString(), '10000', "10000 wasn't in the first account");
  });
});
```

Then use the test command to execute the test
```sh
$ cfxtruffle test
```

Each time cfxtruffle runs a test, a new contract (clean-room) is completely deployed. For details on how to write test code, please refer to the test writing instructions of [js](https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript) and [solidity](https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-solidity).


### Deploy to Remote Nodes
When a contract is developed and tested locally, users can try to deploy it to the testnet or the mainnet. cfxtruffle also supports deploying contracts to a remote node. First, users must add a new network configuration such as testnet to the project configuration file, with the host and port ready. Then the privateKeys field should be set with an array of private keys (remote deployment can only be signed locally).
```js
testnet: {
    host: "wallet-testnet-jsonrpc.conflux-chain.org",
    port: 12537,            
    network_id: "*",       
    // Note: The private keys obtained from the portal need to be prefixed with 0x. privateKeys can also specify a single key. If the private key is configured, please be careful not to upload the code to the public code repository.
    privateKeys: ['your-private-key']  
},
```
The Deposit button of the testnet of Conflux Portal provides a CFX faucet, and users can apply for some testnet tokens for contract deployment.
![](https://github.com/Pana/conflux-101/raw/master/docs/conflux-truffle/faucet.png)

Then deploy the contract to the specified network by specifying --network when executing the deploy command.

```sh
$ cfxtruffle deploy --network testnet
```

### Execute External Script or Command
cfxtruffle provides two commands - `exec` and `run`, which can be used to execute external scripts. In the script, users can write logic to interact with the contract. It is very useful in many cases.

Users can add a script get-balance.js in the project root directory as follows

```js
const Coin = artifacts.require("Coin");
module.exports = async function(callback) {
    try {
        let instance = await Coin.deployed();
        let accounts = await cfx.getAccounts();
        let balance = await instance.balances(accounts[0]);
        console.log(`balance of ${accounts[0]} is: ${balance.toString()}`);
    } catch(e) {
        console.error(e);
    }
    callback();
}
```
Then use the `exec` command to execute it
```sh
$ cfxtruffle exec ./get-balance.js
```

The `run` command can be used to execute the plugin of truffle:：

```sh
$ npm install --save-dev truffle-plugin-hello
```
And add a declaration of the plugin in truffle-config.js
```js
module.exports = {
  /* ... rest of truffle-config */

  plugins: [
    "truffle-plugin-hello"
  ]
}
```
Then use the run command to execute

```sh
$ cfxtruffle run hello
```

Plugins, such as verify, lint and coverage, can be directly used in some contracts on npm. And users can also write custom plugins. [Click here for specific methods.](https://www.trufflesuite.com/docs/truffle/getting-started/writing-external-scripts#creating-a-custom-command-plugin)

## Summary
Following the previously described steps, users can develop a Coin smart contract from the start using cfxtruffle. The usage of its various features and advanced commands is not introduced in detail. Please refer to the official docs of truffle for more details. As a next generation public chain, the mainnet of Conflux is about to be fully launched. All smart contract developers are welcomed to try its super-high performance. We hope that more and more applications will be developed on the Conflux network and realize the digitization of trust.

## 参考

1. [truffle docs](https://www.trufflesuite.com/docs/truffle/overview)
2. [conflux-rust docker](https://hub.docker.com/repository/docker/confluxchain/conflux-rust)
3. [conflux rpc](https://developer.conflux-chain.org/docs/conflux-doc/docs/json_rpc)
4. [How to run a local Conflux node](https://github.com/Pana/conflux-101/blob/master/docs/how-to-run-a-local-independent-node.md)
5. [Solidity docs](https://solidity.readthedocs.io/)
6. [js-conflux-sdk](https://github.com/Conflux-Chain/js-conflux-sdk)
7. [conflux portal](https://portal.conflux-chain.org/)
8. [conflux scan](http://www.confluxscan.io/)
9. [conflux truffle](https://www.npmjs.com/package/conflux-truffle)