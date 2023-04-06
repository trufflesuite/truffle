# @truffle/dashboard-hardhat-plugin

> No more private keys inside `.env` files! Truffle Dashboard lets you sign
> messages with MetaMask and provides insights for better dapp development.
> :lock:

This plugin makes it easy to access all the features of
[Truffle Dashboard](https://trufflesuite.com/docs/truffle/how-to/use-the-truffle-dashboard/),
including better security and high-quality transaction decoding.

## Summary

This plugin automatically adds a `--network truffleDashboard` to your Hardhat
project and tells Truffle Dashboard all the information it needs about your
smart contracts.

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

```console
npm install --save-dev @truffle/dashboard-hardhat-plugin
```

Then simply import the plugin in your `hardhat.config.ts`:

```typescript
import "@truffle/dashboard-hardhat-plugin";
```

## Setup

This extension assumes you have Truffle installed (either globally or in a local
project context). If not, you can install it with `npm i -g truffle`. Beyond
this you'll be able to start Truffle Dashboard with `truffle dashboard`. For
reference, more information on using the Truffle Dashboard can be found
[here](https://trufflesuite.com/docs/truffle/how-to/use-the-truffle-dashboard/).

Alternatively, you can skip the installation and fetch (and run) it remotely
with `npx truffle dashboard`.

This plugin automatically tells Hardhat about the `truffleDashboard` network, so
you don't need to modify your `hardhat.config.ts` to get started. Just specify
`--network truffleDashboard` when running your usual Hardhat commands (e.g.
`npx hardhat run ./scripts/deploy-contracts.ts --network truffleDashboard`).
This managed network will include the `url` property (default
`"http://localhost:24012/rpc"`) and a few other sensible defaults for this
workflow.

**Note on request timeouts**: Signing transactions with MetaMask is slower than
Hardhat computing signatures automatically. For this reason,
@truffle/dashboard-hardhat-plugin disables request timeouts for the
`truffleDashboard` network. See below if you'd like to change this behavior.

### Configuration

> ℹ️ If you want to run Truffle Dashboard on a custom host or port, please
> configure that inside a `truffle-config.js` file in your Hardhat project
> directory. See the
> [truffle-config.js#dashboard](https://trufflesuite.com/docs/truffle/reference/configuration/#dashboard)
> reference documentation to learn more about this; this section pertains only
> to configuring @truffle/dashboard-hardhat-plugin itself.

To configure this plugin, add a `truffle` section to your Hardhat config. This
namespace can contain the following fields (all are optional):

- **`dashboardNetworkName`** _(default: `"truffleDashboard"`)_: Specify the name
  of the Truffle Dashboard network, e.g. via the `--network <...>` command-line
  option.

- **`dashboardNetworkConfig`**: A subset of the usual Hardhat network
  configuration settings.

  You can use this to override managed network behavior for any fields
  documented by Hardhat's
  [JSON-RPC based networks](https://hardhat.org/hardhat-runner/docs/config#json-rpc-based-networks)
  reference **except** `chainId`, `from`, `accounts`, and `url`. (This plugin
  supplies `url`; the other three fields are meaningless in the Truffle
  Dashboard signing workflow.)

  All `dashboardNetworkConfig` properties are optional. The following field has
  a different default than what Hardhat normally provides:

  - **`timeout`** _(default: `0`; i.e., no timeout)_: Hardhat's normal default
    value for this is `40000` (40 seconds)

## Usage

Assuming the above is all looking good, any subsequent compilations via
`npx hardhat compile` will send the compiled artifacts to Truffle Dashboard.
Subsequently, any deployments (or transactions via scripts) that target the
`truffleDashboard` network will now send them to Truffle Dashboard for signing
via your browser-based wallet.

> Note you'll need to ensure your browser-based wallet is unlocked for
> transactions to be received (otherwise you might see a
> `Cannot read properties of null (reading 'sendTransaction')` when running the
> command below).

```console
npx hardhat run scripts/deploy.ts --network truffleDashboard
```

![Truffle Dashboard](./assets/truffle-dashboard-screenshot.jpg)

## Support

As always, if you have any questions or run into any issues, please reach out to
us on our
[Github Discussion board](https://github.com/orgs/trufflesuite/discussions) or
on [Twitter](https://twitter.com/trufflesuite).
