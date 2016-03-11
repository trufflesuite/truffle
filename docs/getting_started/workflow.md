# Commands

We've recommended the [EthereumJS TestRPC](https://github.com/ethereumjs/testrpc) a number of times to get you quick feedback during development. However, Truffle comes with two commands that can make development even faster.

### truffle watch

Watch your filesystem for changes and recompile and redeploy your contracts, if needed, and rebuild your frontend when there are changes.

Usage:

```
$ truffle watch
```

See the [command reference](/advanced/commands) for more information.

### truffle serve

Watch your filesystem for changes and recompile, redeploy and rebuild, like `truffle watch`, and serve the built project on *http://localhost:8080*.

Usage:

```
$ truffle serve
```

You can override the port Truffle serves on. See the [command reference](/advanced/commands) for more information.
