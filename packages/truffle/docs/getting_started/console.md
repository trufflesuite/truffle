# Background

Sometimes it's nice to work with your contracts interactively for testing and debugging purposes, or for executing transactions by hand. Truffle provides you an easy way to do this via an interactive console, with your contracts available and ready to use.

# Command

To fire up the console, simply run:

```none
$ truffle console
```

This will load up a console for the default environment, which is `development`. You can override this using the `-e` option. See more details in the [environments](/advanced/environments) section as well as the [command reference](/advanced/commands).

When you load the console, you'll immediately see output like this:

```
$ truffle console
truffle(development)>
```

This tells you you're running within a Truffle console using the development environment.

# Features

The console provides the following features:

* All of your compiled contracts are available and ready for use, as if you were developing tests or your frontend.
* The `web3` library is made available and is set to connect to your Ethereum client.
