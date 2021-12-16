# Truffle Dashboard

The Truffle Dashboard is the frontend that is used in certain parts of the Truffle stack. Currently it is only used for the dashboard-provider by forwarding any provider requests to the dashboard, where they can be processed by an injected browser wallet such as Metamask. Additional use cases may be added to the Dashboard in the future.

## Installation & Usage

There is usually no reason to install the `@truffle/dashboard` package directly, since it will be started automatically when running `truffle dashboard` or when using `@truffle/dashboard-provider`. But if you are developing extensions to the Truffle Dashboard it can be useful to install the dashboard.

```
npm install @truffle/dashboard
```

```
yarn add @truffle/dashboard
```

The `@truffle/dashboard` package can then be used to start a new dashboard process either in the foreground or background.

```js
const {
  DashboardServer,
  startDashboardInBackground
} = require("@truffle/dashboard");

const port = 24012;
const host = "localhost";

// Start a new dashboard server
const dashboardServer = new DashboardServer({ port, host });
await dashboardServer.start();

// Or start one in a separate background process
const backgroundProcess = startDashboardInBackground({ port, host });
```

### Configuration options

The `DashboardServer` constructor takes a config object with a number of options.

```ts
export interface DashboardServerOptions {
  /** Port of the dashboard */
  port: number;

  /** Host of the dashboard (default: localhost) */
  host?: string;

  /** Boolean indicating whether the POST /rpc endpoint should be exposed (default: true) */
  rpc?: boolean;

  /** Boolean indicating whether debug output should be logged (default: false) */
  verbose?: boolean;

  /** Boolean indicating whether whether starting the DashboardServer should automatically open the dashboard (default: true) */
  autoOpen?: boolean;
}
```

### Logging

When setting the dashboard server's `verbose` option to `true`, debug output is logged in the following "debug" namespaces

- `dashboard-message-bus:connections` - logs connections and disconnections of message bus publishers and subscribers
- `dashboard-message-bus:requests` - logs requests that get sent from publishers to subscribers
- `dashboard-message-bus:responses` - logs responses sent back from subscribers to publishers
- `dashboard-message-bus:errors` - logs errors that occur in the message bus

## Development

### Architecture

The `@truffle/dashboard` package contains two separate source code directories, one of them is the `lib/` directory which contains the "library" code (such as the `DashboardProviderServer` class). The other is the `src/` directory which contains the React frontend code. When running `yarn build` both are compiled and combined so that the `DashboardServer` can serve the static dashboard page.

Besides serving the static dashboard web page, the `DashboardServer` also runs a "port discovery" API at `GET /ports`, which returns the publish and subscribe ports that can be used to connect to the associated message bus. By default, it also runs an RPC endpoint at `POST /rpc` that forwards any RPC requests to the message bus (and from there on to the dashboard).

The dashboard frontend requires the user to connect their wallet before using the application. Once the wallet is connected, a WebSocket connection is established with the message bus and the dashboard starts listening for incoming requests.

When receiving `"provider"` messages, they are forwarded to the `DashboardProvider` component where they can be inspected and processed. When receiving `"invalidate"` requests, the request with the passed ID gets removed from the stored list of requests. Other message types are ignored.

When the connected network changes, all functionality gets paused until the user changes it back or confirms that they meant to change the network.

### Running during development

The Dashboard Server requires the frontend to be built in order to serve it, and the frontend requires a dashboard server to be running for message bus port discovery. But during development it can be time-consuming to re-build the entire React app after every change. So for development purposes we've created a workaround where we start two separate servers, one for the port discovery and message bus on port 24012, and the other for the frontend React app on port 3000. This gives us all the goodness of React, such as hot reloading during development, while also running the message bus and port discovery API.

```
yarn start
```

### Creating new Dashboard integrations

When creating new integrations for the dashboard, there are three places to add code.

- A new message type in the `@truffle/dashboard-message-bus` package.
- Integration code in the React frontend in the `@truffle/dashboard` package.
- Integration code in the Truffle CLI - this can be a completely new package, or added to an existing package.

In general the Truffle CLI sends requests to the dashboard, which uses the provided information and sends a response back. But for more complex integrations it may be required for the dashboard to send requests to the Truffle CLI, or for the Truffle CLI to send information without expecting a response back. In those cases the code on either side of the integration should be updated accordingly.
