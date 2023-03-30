# @truffle/dashboard-hardhat-plugin

Enable decoded results when using
[Truffle Dashboard](https://trufflesuite.com/docs/truffle/how-to/use-the-truffle-dashboard/)
with your Hardhat projects.

## What

This plugin enables you to see decoded transaction information (both the
function signature and the values of any arguments passed) when using
[Truffle Dashboard](https://trufflesuite.com/docs/truffle/how-to/use-the-truffle-dashboard/)
with your Hardhat projects.

It extends `npx hardhat compile` by sending the compiled artifacts to Truffle
Dashboard, which in turn uses
[@truffle/decoder](https://trufflesuite.com/docs/truffle/codec/modules/_truffle_decoder.html)
for decoding, giving you that extra degree of visibility before signing the
transactions with your browser-based wallet.

![Before and after using the Truffle Dashboard Hardhat plugin](./assets/truffle-dashboard-before-after.jpg)

## Installation

You can install this plugin with `npm` (or `yarn`) by running:

```bash
npm i @truffle/dashboard-hardhat-plugin -D
```

Beyond that, simply import the plugin in your `hardhat.config.js`:

```ts
import "@truffle/dashboard-hardhat-plugin";
```

## Setup

This extension assumes you have `truffle` installed (either globally or in a
local project context). If not, you can install it with `npm i -g truffle`.
Beyond this you'll be able to start Truffle Dashboard with `truffle dashboard`.
For reference, more information on using the Truffle Dashboard can be found
[here](https://trufflesuite.com/docs/truffle/how-to/use-the-truffle-dashboard/).

Alternatively, you can skip the installation and fetch (and run) it remotely
with `npx truffle dashboard`.

This plugin automatically tells Hardhat about the `"truffle-dashboard"` network,
so you don't need to anything to your `hardhat.config.ts` to get started! Just
specify `--network truffle-dashboard` when running your usual Hardhat commands
(e.g.
`npx hardhat run ./scripts/deploy-contracts.ts --network truffle-dashboard`).

### Configuration

This plugin's defaults to injecting `url` and other network properties into your
project's `networks` configuration automatically.

This `url` property respects any local `truffle-config.js`, so if you'd like to
run Truffle Dashboard on a custom `host` or `port`, please make that file inside
your Hardhat project directory and see the
[truffle-config.js#dashboard](https://trufflesuite.com/docs/truffle/reference/configuration/#dashboard)
reference documentation to learn how to configure this. The rest of this section
of this README covers how to configure @truffle/dashboard-hardhat-plugin itself.

#### Configure managed network

This plugin defines the `truffleDashboard` namespace within the Hardhat config.

Please see the following configuration settings (all of these are optional):

- **`disableManagedNetwork`** _(default: `false`)_: Ignore `networkConfig` and
  don't add anything to `config.networks`. See below to learn how to
  [turn off automatic network management](#turn-off-automatic-network-management).

- **`networkName`** _(default: `"truffle-dashboard"`)_: Specify the name of the
  Truffle Dashboard network, e.g. via the `--network <...>` command-line option.

- **`networkConfig`**: A subset of the usual Hardhat network configuration
  settings. This field is ignored if `disableManagedNetwork` is set to `true`.

  You can use this to override managed network behavior for any fields
  documented by Hardhat's
  [JSON-RPC based networks](https://hardhat.org/hardhat-runner/docs/config#json-rpc-based-networks)
  reference **except** `chainId`, `from`, `accounts`, and `url`. (This plugin
  supplies `url`, and the other three fields are meaningless in the Truffle
  Dashboard signing workflow.)

  All `networkConfig` properties are optional. The following field has a
  different default than what Hardhat normally provides:

  - **`timeout`** _(default: `0`; i.e., no timeout)_: Hardhat's normal default
    value for this is `40000` (40 seconds)

<h4 id="turn-off-automatic-network-management">Turn off automatic network management</h4>

If you'd rather this plugin not get fancy, you might want to just define the
network yourself.

To do this, make sure you specify `disableManagedNetwork: true`. This plugin
will need to read from your configuration, so if you give your network a name
different than the default `"truffle-dashboard"`, you'll also need to specify
`networkName`.

See this example `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@truffle/dashboard-hardhat-plugin";

const config: HardhatUserConfig = {
  networks: {
    // ... other networks ...

    dashboard: {
      url: "http://localhost:24012/rpc",
      timeout: 0 // disable timeout to have enough time for MetaMask pop-ups
    }
  },

  // ... rest of config ...

  truffleDashboard: {
    networkName: "dashboard",
    disableManagedNetwork: true
  }
};
```

## Usage

Assuming the above is all looking good, any subsequent compilations via
`npx hardhat compile` will send the compiled artifacts to Truffle Dashboard.
Subsequently, any deployments (or transactions via scripts) that target the
`"truffle-dashboard"` network will now send them to Truffle Dashboard for
signing via your browser-based wallet.

> Note you'll need to ensure your browser-based wallet is unlocked for
> transactions to be received (otherwise you might see a
> `Cannot read properties of null (reading 'sendTransaction')` when running the
> command below).

```console
npx hardhat run scripts/deploy.ts --network truffle-dashboard
```

![Truffle Dashboard](./assets/truffle-dashboard-screenshot.jpg)

## Support

As always, if you have any questions or run into any issues, please reach out to
us on our
[Github Discussion board](https://github.com/orgs/trufflesuite/discussions) or
on [Twitter](https://twitter.com/trufflesuite).
