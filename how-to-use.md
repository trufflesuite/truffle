How to use
===
[Truffle](https://www.trufflesuite.com/) is a world class ethereum development environment. 
It can make smart contract develop, compile, test, deploy more easy.
[Conflux](https://confluxnetwork.org/) is a new secure and reliable public blockchain with very high performance and scalability.
Conflux's contract VM is compatible with EVM, so developer can use Solidity develop smart contract for Conflux.
To ease the develop life of Conflux smart contract, we have port truffle to Conflux network -- `Conflux-Truffle`

`Conflux-Truffle`'s most function and use method is same to Truffle.

## [Conflux-Truffle](https://www.npmjs.com/package/conflux-truffle) install
Install `Conflux-Truffle` globally with npm.

```sh
$ npm install -g conflux-truffle
```
After install you will have command `cfxtruffle`

```sh
# show command help message
$ cfxtruffle -h
```

## Run a Conflux client
When developing smart contract, a blockchain client is necessary, in trufflesuite you can choose truffle develop or Ganache. We haven't port ganache to Conflux now. but we provide other options for you:

#### Use conflux-rust docker
If you have docker installed or familiar with it you can run a Conflux client with the official [confluxchain/conflux-rust](https://hub.docker.com/r/confluxchain/conflux-rust) docker image.

```sh
# pull image
$ docker pull confluxchain/conflux-rust
# fast run a single node local chain
$ docker run -p 12537:12537 --name cfx-node confluxchain/conflux-rust
```
When this image start up, you will have 10 local gene accounts, each with 1000 CFX, you can directly use them to deploy your contract.
Note the default account password is `123456`.

If you want use this image start a mainnet node, you can use your own Conflux config file, for example.
```sh
# 
$ docker run -p 12537:12537 -v $(pwd)/run:/root/run --name cfx-node confluxchain/conflux-rust
```
The folder on your local machine should include these files: default.toml, log.yaml, throttling.toml
The blockchain data will also save to your local folder.


#### Direct run a rust client
You can directly download a conflux-rust binary from github release page, or compile it from source code.
When you have the `conflux` binary and config template, you are ready to start a local client. 
Before kicking off the command, edit these option in your config file:

1. set `mode` to `dev`
2. set `bootnodes` to empty or comment it out.
3. set `mining_author` to your account address
4. set `jsonrpc_http_port` to `12537`

Then you can start the client:

```sh
./conflux --config defalut.toml
```

After the client start up, `mining_author` will receive the mining reward, you should create several local account with `conflux account` command.

```sh
# create a new local account, remember to set password to 123456
$ ./conflux account new
# list account
$ ./conflux account list
```

Then you can transfer some CFX from `mining_author` to these accounts. With these local accounts have balance then you can start to use `cfxtruffle` to develop smart contract.

```Recommend use conflux-rust docker```


## Intro of cfxtruffle usage 
If you are familiar with truffle, then you can just go to use cfxtruffle immediately,
If not here is a simple intro to how to use cfxtruffle to develop smart contract.

#### create project
create a empty project
```sh
$ cfxtruffle init 
```
create project from templates -- [box](https://www.trufflesuite.com/boxes)

```sh
$ mkdir MetaCoin
$ cd MetaCoin
$ cfxtruffle unbox metacoin
```

A cfxtruffle project will include these folders:

* `build` contract compiled stuff（json）
* `contracts` solidity code 
* `migrations` migration scripts 
* `test` testing file
* `truffle-config.js` config file

#### create new contracts, tests, migrations

`cfxtruffle create` Helper to create new contracts, migrations and tests

```sh
$ cfxtruffle create contract MetaCoin
$ cfxtruffle create migration MetaCoin
$ cfxtruffle create test MetaCoin
```
The create command will create files in `contracts`, `migrations`, `test` folder.
Notice the automated created migration file's name will include timestamp, you need manual change to the correct sequal number. For detail reason check [here](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations#migration-files)

#### compile contract

```sh
$ cfxtruffle compile
```
All compiled stuff saved at `build` folder.

#### deploy contract

```sh
$ cfxtruffle deploy # or cfxtruffle migrate
```
`deploy` is a alias to `migrate`, truffle use `migration` command run contract deploy and migrate.

1. Every script in migration folder define a migrate task, if you add a new contract you should add a new migration scripts.
2. Every truffle project will have a contract called `Migration` which used to save the project's last migration number, this contract have two method: `last_completed_migration()`, `setCompleted(num)`
3. When cfxtruffle deploy run it will get the last deployed number from chain, will only run new added migration tasks.

`cfxtruffle deploy` also provide three paramter (--reset, --from, --to) which can control the migration running rule. For detail explanation check [here](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations)

#### interact with contract

cfxtruffle also provide a command that enable us interact with a contract convenient.

```sh
$ cfxtruffle console  # run console in your project root, it will open a interactive console
# initiate a contract instanse
cfxtruffle(develop)> let instance = await MetaCoin.deployed()
cfxtruffle(develop)> instance
# invoke contract state query method
cfxtruffle(develop)> let balance = await instance.getBalance(accounts[0])
cfxtruffle(develop)> balance.toNumber()
# invoke contract state change method
cfxtruffle(develop)> let result = await instance.sendCoin(accounts[1], 10, {from: accounts[0]})
cfxtruffle(develop)> result
# most truffle commands also available here
cfxtruffle(develop)> compile
cfxtruffle(develop)> networks
# You can also access to `js-conflux-sdk`'s cfx, cfxutil
cfxtruffle(develop)> let balance = await cfx.getBalance("0x-one-address")
cfxtruffle(develop)> cfxutil.unit.fromCFXToDrip(123)
```

For detail documentation check truffle [console](https://www.trufflesuite.com/docs/truffle/getting-started/using-truffle-develop-and-the-console) and [interact with contract](https://www.trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts).
And for the documentation of `js-conflux-sdk` find it [here](https://github.com/conflux-chain/js-conflux-sdk)

#### contract testing

Truffle comes standard with an automated testing framework (built onto mocha and chai)

Unit test code examples
```js
const MetaCoin = artifacts.require("MetaCoin");

contract('MetaCoin', (accounts) => {
  it('should put 10000 MetaCoin in the first account', async () => {
    const metaCoinInstance = await MetaCoin.deployed();
    const balance = await metaCoinInstance.getBalance.call(accounts[0]);

    assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
  });
}
```

run tests
```sh
$ cfxtruffle test
```

## Deploy to remote node
cfxtruffle now support deploy contract to a remote node, the only work to do is set the `privateKeys` in truffle-config.

```js
development: {
    host: "testnet-jsonrpc.conflux-chain.org",
    port: 12537,
    network_id: "*",       
    type: "conflux",
    // the magic field
    privateKeys: ["keys1xxxxxx", "keys1xxxxxx"],   // you can also directly set one key here: privateKeys: "one key"
},
```

## truffle commands not supported now

* develop
* build

## Conclude
For complete documentation you can check [truffle's doc](https://www.trufflesuite.com/docs/truffle/overview)

