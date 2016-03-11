# Client Configuration

Before deploying contracts to the network, ensure your Ethereum client is running and receiving requests on `http://localhost:8545`. This is the default location Truffle expects your client to handle requests, though you can change this within your [project configuration](/advanced/configuration). If you're using the [EthereumJS TestRPC](https://github.com/ethereumjs/testrpc), you're all set as it defaults to that hostname and port number.

# Command

To deploy your contracts to your Ethereum client, run:

```none
$ truffle deploy
```

This will compile any uncompiled contracts and then deploy all contracts specified within your [project configuration](/advanced/configuration). You'll need to update the configuration whenever you write new contracts you'd like deployed.

# Considerations

Most dapps have special deployment requirements that are complex and difficult for tool maintainers to predict. Instead of attempting to support all possible deployment use cases, Truffle instead only tries to support one, where contracts have the following characteristics:

* All deployed contracts are singletons, meaning you only intend for one instance of that contract to exist in the wild.
* All deployed contracts take no constructor parameters.

Though this deployment support is narrow, we believe it requires you to think clearly about how your application will be built. For instance, you need to answer the question, "Which contracts does my application need to exist on the network at all times, and which contracts will my application instantiate during normal execution?". The answer should tell you which contracts you want to include in `truffle deploy` and which ones you don't.

# Custom Deployment

You can extend Truffle's deployment capabilities if you have custom deployment requirements or you'd like to run a script after every deploy. See the [after_deploy](/advanced/configuration/#after_deploy) configuration option for more details.
