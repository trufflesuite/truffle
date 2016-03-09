##### build           

Build a development version of the app; creates the `./environments/<name>/build` directory.

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

Once the console starts you can then use your contracts via the command line like you would in your code.

Optional parameters:

* `-e environment`: Specify the environment. Default is "development".
* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### compile

Intelligently compile your contracts. This will only compile contracts that have changed since the last compile, unless otherwise specified.

```
$ truffle compile
```

Optional parameter:

* `--compile-all`: Compile all contracts instead of intelligently choosing.

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

Compile and deploy contracts to the network. Will only deploy the contracts specified in the app's `deploy` configuration. Contracts are compiled intelligently unless otherwise specified.

```
$ truffle deploy
```

Optional parameters:

* `-e environment`: Specify the environment. Default is "development".
* `--compile-all`: Compile all contracts instead of intelligently choosing.
* `--verbose-rpc`: Log communication between Truffle and the RPC.

Deploying contracts will save [Pudding](https://github.com/ConsenSys/ether-pudding) class files within your environment's `contracts` directory that correspond to each of your contracts. These class files can be used in Truffle's build process or your own build process to interact with the Ethereum network.

##### dist           

Build a distributable version of the app; creates the `./environments/<name>/dist` directory.

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

##### resolve

Resolve all dependencies within solidity files and print the result.

```
$ truffle resolve ./path/to/contract/file.sol
```

##### serve

Serve the built app from `http://localhost:8080`, rebuilding and redeploying changes as needed. Like `truffle watch`, but with the web server component added.

```
$ truffle serve
```

Optional parameters:

* `-e environment`: Specify the environment. Default is "development".
* `-p port`: Specify the port to serve on. Default is 8080.

##### test

Run all tests within the `./test` directory, or optionally run a single test.

```
$ truffle test [/path/to/test/file]
```

Optional parameters:

* `-e environment`: Specify the environment. Default is "test".
* `--compile-all`: Compile all contracts instead of intelligently choosing.
* `--verbose-rpc`: Log communication between Truffle and the RPC.

##### version

Show version number and exit.

```
$ truffle version
```

##### watch

Watch for changes to contracts, app and configuration files. When there's a change, rebuild the app and redeploy changes to the contracts if necessary.

```
$ truffle watch
```
