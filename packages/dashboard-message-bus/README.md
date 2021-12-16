# @truffle/dashboard-message-bus

:warning: **This is a middleware package and should only be used when developing integrations for the truffle dashboard** :warning:

The `@truffle/dashboard-message-bus` manages the communication between the Truffle Dashboard and any other Truffle components, such as the dashboard-provider.

## Installation

End users should never have to install the message bus as it is used under the hood by other packages. If you are building a package that needs to interface with the Dashboard or message bus, you can install the package from NPM.

```
npm install @truffle/dashboard-message-bus
```

```
yarn add @truffle/dashboard-message-bus
```

## Usage

A new message bus can be started by instantiating a new `DashboardMessageBus` and calling the `start()` function on it. This should almost always be done in combination with starting a new dashboard, so you probably don't want to do this directly. Instead you should start a new dashboard, which automatically starts its corresponding message bus.

The `@truffle/dashboard-message-bus` does contain a bunch of exported utilities used for connecting and communicating with the message bus that can be used directly by other packages, although this should still only be used when developing new packages that interface with the dashboard, rather than end-user applications.

## Development

### Architecture

The message bus works by running two separate WebSocket servers. One server is for publishers to connect to and send requests, while the other server is for subscribers (dashboards) to connect to and receive requests. The subscribers respond to these requests by sending a message to the message bus with an ID that corresponds to the request. Any requests from publishers are sent to all subscribers, but only the first response will be returned to the publisher. When new subscribers connect, any "unfulfilled" requests will be sent to the newly connected subscribers as well. The message bus stays running as long as there is at least one publisher _or_ subscriber connected. As soon as the last one disconnects, the message bus shuts down.

### Testing

This package is meant to be used with the `@truffle/dashboard` package. So manual testing is most likely done through the dashboard package. Some automated tests are defined in the `test/` folder, but these still need to be expanded. The message bus functionality is also tested indirectly by the automated tests in the `@truffle/dashboard-provider` and `@truffle/dashboard` packages.

### Adding new message types

Right now there are very few message types. The most important one is `"provider"`, which sends RPC requests for the dashboard-provider. Other message types are `"invalidate"`, which can be sent to invalidate earlier messages, and `"log"`, which is sent by the message bus to send log messages over the wire. The interfaces of these messages are defined inside the `@truffle/dashboard-message-bus` package, from where they can be imported by consumers.

To add additional message types, the interface for the new message type should be defined in this package under `lib/message/types.ts`. To use these new messge formats, support needs to be added to any consuming packages such as `@truffle/dashboard` as well.
