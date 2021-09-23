# @truffle/dashboard-message-bus

:warning: **This is a middleware package and should only be used when developing integrations for the truffle dashboard** :warning:

The `@truffle/dashboard-message-bus` manages the communication between the Truffle Dashboard and any other Truffle components, such as the browser provider. It works by running two separate WebSocket servers. One server is for clients to connect to and send requests, while the other server is for listeners (dashboards) to connect to and receive requests.

Any requests from clients are sent to all listeners, but only the first response will be returned to the client. When new listeners connect, any "unfulfilled requests" will be sent to the newly connected listeners as well.

The message bus stays running as long as there is at least one client *or* listener connected. As soon as the last one disconnects, the message bus shuts down.

## Installation

End users should never have to install the message bus as it is used under the hood by other packages. If you are building a package that needs to interface with the Dashboard or message bus, you can install the package from NPM.

```
npm install @truffle/dashboard-message-bus
```

```
yarn add @truffle/dashboard-message-bus
```

## Usage

A new message bus can be started by instantiating a new `DashboardMessageBus` and calling the `start()` function on it. This should almost always be done in combination with starting a new dashboard, so you probably don't want to do this, directly. Instead you should start a new dashboard, which automatically starts its corresponding message bus.

The `@truffle/dashboard-message-bus` does contain a bunch of exported utilities used for connecting and communicating with the message bus that can be used directly by other packages, although this should still only be used when developing new packages that interface with the dashboard, rather than end-user applications.

## Development

This package is meant to be used with the `@truffle/dashboard` package. So manual testing is most likely done through the dashboard package.

Some automated tests are defined in the `test/` folder, but these still need to be expanded. The message bus functionality is also tested indirectly by the automated tests in the `@truffle/browser-provider` package.
