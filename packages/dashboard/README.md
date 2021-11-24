# Truffle Dashboard

The Truffle Dashboard is the frontend that is used in certain parts of the Truffle stack. Currently it is only used for the dashboard-provider by forwarding any provider requests to the dashboard, where they can be processed by an injected browser wallet such as Metamask. Additional use cases may be added to the Dashboard in the future.

## Installation & Usage

There is usually no reason to install the `@truffle/dashboard` package directly, since it will be started automatically when using `@truffle/dashboard-provider`. But if you are developing extensions to the Truffle Dashboard it can be useful to install the dashboard.

```
npm install @truffle/dashboard
```

```
yarn add @truffle/dashboard
```

The `@truffle/dashboard` package can then be used to start a new dashboard process either in the foreground or background.

```js
const {
  startDashboard,
  startDashboardInBackground
} = require("@truffle/dashboard");

const port = 24012;
const host = "localhost";
const dashboardExpressApp = await startDashboard(port, host);
const backgroundProcess = startDashboardInBackground(port, host);
```

## Development

The `lib/` directory contains an Express server that serves the static dashboard page as well as a simple Express API that can be used to retrieve the ports used to connect to the message bus. But this requires the frontend React app to be built, which can take considerable time. So during development we've created a workaround where we start two separate servers, one for the port discovery and message bus on port 24012, and the other for the frontend React app on port 3000. This gives us all the goodness of React, such as hot reloading during development, while also running the message bus and port discovery API. This is recommended when working specifically on the dashboard frontend.

```
yarn start
```
