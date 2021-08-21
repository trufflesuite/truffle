# @truffle/browser-provider

## Automated testing

`test/` contains a few very simple tests that test basic functioning of the BrowserProvider + Message Bus + Dashboard infrastructure. It uses a mocked "dashboard" that rather than opening a browser window just forwards all requests to Ganache. These tests still need to be expanded.

## Manual testing

`manual-test/` contains some more "real-world" usage of the BrowserProvider. The `manual-test.ts` script contains some requests to the BrowserProvider, including `eth_sendTransaction` and `eth_signTypedData_v4`. `metacoin-truffle/` contains the source code for a simple MetaCoin project using Truffle. `metacoin-hardhat/` contains the same contract source code but using Hardhat.

To run these manual tests use the following commands:

```
yarn test:manual:basic
yarn test:manual:metacoin-truffle
yarn test:manual:metacoin-hardhat
```

Note that the dashboard does not automatically start so you'll have to open `http:localhost:5000` in your browser to use the browser provider dashboard.
