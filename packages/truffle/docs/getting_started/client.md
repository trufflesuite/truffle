There are many Ethereum clients to choose from. We recommend using different clients when developing and deploying.

# When Developing

* EthereumJS TestRPC: [https://github.com/ethereumjs/testrpc](https://github.com/ethereumjs/testrpc)

When developing your Truffle-based application, we recommend using the [EthereumJS TestRPC](https://github.com/ethereumjs/testrpc). It's a complete blockchain-in-memory that runs only on your development machine. It processes transactions instantly instead of waiting for the default block time -- so you can test that your code works quickly -- and it tells you immediately when your smart contracts run into errors. It also makes a great client for automated testing, and Truffle knows how to use its special features to speed up test runtime by almost 90%.

# When Deploying

* Geth (go-ethereum): [https://github.com/ethereum/go-ethereum](https://github.com/ethereum/go-ethereum)
* WebThree (cpp-ethereum): [https://github.com/ethereum/webthree-umbrella](https://github.com/ethereum/webthree-umbrella)
* More: [https://www.ethereum.org/cli](https://www.ethereum.org/cli)

There are many official and unofficial Ethereum clients available for you to use. You should use these clients after you've sufficiently tested your dapp with the EthereumJS TestRPC and you're ready to deploy to the Ethereum network. These are full client implementations that include mining, networking, blocks and transaction processing, and Truffle can deploy to these clients without any extra configuration.
