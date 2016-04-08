# Background

Even the smallest project will interact with at the very least two blockchains: One on the developer's machine, like the [EthereumJS TestRPC](https://github.com/ethereumjs/testrpc), and the other representing the network where the developer will eventually deploy their application (this could be a public or private network). Managing artifacts for each blockchain can be complicated. For instance, you may have different versions of your contracts deployed to different networks while you continue development -- like a "staging" and a "live" network -- and you'll have to maintain separate builds of your frontend in order to correctly point to your deployed contracts on each network. Similarly, contract binaries need to be managed, which is generally a tedious task better handled by a tool. Thankfully Truffle provides a way of managing all these build artifacts, and it is introduced via the concept of environments.

# Defaults

By default `truffle init` gives you four environments. You aren't limited to these environments and you can change them at will, but we recommend you at least keep the ones marked recommended below.

* `development`: Default environment for most commands. Represents the environment on the developer's machine. (recommended)
* `staging`: Represents a "staging environment" or shared testing blockchain where you'd deploy a development version of your application for others to use and test.
* `production`: Represents the public Ethereum network, or the main network where you will eventually deploy your application.
* `test`: Default environment when running automated tests. (recommended)

# Specifying an Environment

Most Truffle commands will behave differently based on the environment specified, and will use that environment's built contracts and configuration. You can specify an environment using the `-e` argument, like below:

```
$ truffle deploy -e production
```

In this case, Truffle will deploy new versions of your deployable contracts to the Ethereum client specified in the production environment. Note that if you don't override the default configuration options for the environment chosen -- details below -- then Truffle will use the options specified in your [project configuration](/advanced/configuration).

# Environment Configuration

You can override the default project configuration within each of your environments by editing the environment's `config.json` file. This is a JSON file instead of a Javascript file, contrary to `truffle.js`. Future versions of Truffle will convert these files to Javascript files so they can act more like your global project configuration. For now, however, you must specify these overrides via JSON. Consider this example:

**truffle.js**
```javascript
module.exports = {
  rpc: {
    host: "localhost",
    port: 8545
  }
}
```

**./environments/production/config.json**
```javascript
{
  "rpc": {
    "host": "192.168.1.144" // domain of ethereum client pointing to live network
    "port": 8673            // custom port
  }
}
```

In this example, when running `truffle deploy` Truffle will deploy to an Ethereum client located at *http://localhost:8545*. However, when running `truffle deploy -e production`, Truffle will deploy to an Ethereum client located at *http://192.168.1.144:8673*.

# Build Artifacts

Except for the `config.json` file located in each environment, every other file within your environment's directory is a build artifact. These artifacts are organized in two ways:

* `build`: Directory of built frontend. When using the [default builder](/getting_started/build), `truffle build` will automatically place build artifacts here.
* `contracts`: Directory containing compiled contract output. These files have the extension ".sol.js", and are created by [Ether Pudding](https://github.com/ConsenSys/ether-pudding) to be easily integrated into any build process.

If using Truffle's [default builder](/getting_started/build), you will not have to interact with these build artifacts directly. However, if you choose to use a custom build process, you'll need to use these artifacts in order to correctly bootstrap your application. See the [advanced build processes](/advanced/build_processes) section for more details.


# Renaming Environments

If you'd like your environment names to better represent the networks you'll be deploying to, simply change the name of the directory. For instance, your `./environments` directory might look like this:

```
environemnts/
- development/
- live/
- morden/
- test/
```

To deploy to the [Morden testnet](https://github.com/ethereum/wiki/wiki/Morden), if properly configured, simply run:

```
$ truffle deploy -e morden
```

# Repository Considerations

We recommend you do not commit the contents of the `./environments/development` directory to your repository as it contains build artifacts specific to the developer who generated them. However, we highly recommend you commit the contents of the `production` environment -- and any other environment where you're maintaining a deployment, like `staging` -- in order to keep those artifacts managed in one place.
