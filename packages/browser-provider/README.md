# @truffle/browser-provider

@truffle/browser-provider enables communication between command-line or desktop applications and browser-based Ethereum wallets such as Metamask. One important use case is that it allows you to use your Metamask wallet with smart contract development tools such as Truffle.

## Installation

```
npm install @truffle/browser-provider
```

```
yarn add @truffle/browser-provider
```

## Usage

The browser provider can be used in place where you'd use any other web3 provider. See the examples below for using it with Ethers.js and Web3.js.

### Ethers.js

```js
const { BrowserProvider } = require('@truffle/browser-provider');
const { providers } = require('ethers');

const browserProvider = new BrowserProvider();
const ethersProvider = new providers.Web3Provider(browserProvider);

const [account] = await ethersProvider.listAccounts();
```

### Web3.js

```js
const { BrowserProvider } = require('@truffle/browser-provider');
const Web3 = require('web3');

const browserProvider = new BrowserProvider();
const web3 = new Web3(browserProvider);

const [account] = await web3.eth.getAccounts();
```

### Configuration options

The `BrowserProvider` constructor takes a config object with a number of options.

```ts
export interface BrowserProviderOptions {
  /** Host of the Dashboard (default: localhost) */
  dashboardHost?: string;

  /** Port of the Dashboard (default: 5000) */
  dashboardPort?: number;

  /** Number of seconds before a browser-provider request times out (default: 120) */
  timeoutSeconds?: number;

  /** Boolean indicating whether the connection to the dashboard is kept alive between requests (default: false) */
  keepAlive?: boolean;
}
```

## Logging
For additional logging output from the browser provider and message bus we use the "debug" package with the following namespaces:

- `truffle:dashboard:messagebus:connections` - logs connections and disconnections of message bus clients and listeners
- `truffle:dashboard:messagebus:requests` - logs requests that get sent from clients to listeners
- `truffle:dashboard:messagebus:responses` - logs responses sent back from listeners to clients
- `truffle:dashboard:messagebus:errors` - logs errors that occur in the message bus

## Development

The entire browser-provider stack consists of three separate packages within the `trufflesuite/truffle` repository. `@truffle/browser-provider` contains the actual `Provider` interface that forwards requests to the dashboard. The `@truffle/dashboard` package contains a React app that receives incoming requests, displays them to the user, and then forwards them to the browser's injected web3 wallet. Finally `@truffle/dashboard-message-bus` ties the two packages together with a message bus that relays requests and responses between the browser provider and the dashboard, using multiple WebSocket connections.

Refer to the READMEs of the other packages for more information on those components.

### Automated testing

`test/` contains a few very simple tests that test basic functioning of the BrowserProvider + Message Bus + Dashboard infrastructure. It uses a mocked "dashboard" that rather than opening a browser window just forwards all requests to Ganache.

### Manual testing

`manual-test/` contains some more "real-world" usage of the BrowserProvider. The `manual-test.ts` script contains some requests to the BrowserProvider, including `eth_sendTransaction` and `eth_signTypedData_v4`. `metacoin-truffle/` contains the source code for a simple MetaCoin project using Truffle. `metacoin-hardhat/` contains the same contract source code but using Hardhat.

Note that Hardhat doesn't support custom providers in their config files, so we hacked it into the deployment script.

To run these manual tests use the following commands:

```
yarn test:manual:basic
yarn test:manual:metacoin-truffle
yarn test:manual:metacoin-hardhat
```

Note that the dashboard does not automatically open so you'll have to open `http://localhost:5000` in your browser to access the dashboard.
