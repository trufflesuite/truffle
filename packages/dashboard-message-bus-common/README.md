# @truffle/dashboard-message-bus-common

:warning: **This is a middleware package and should only be used when developing integrations for the truffle dashboard** :warning:

This package serves as a set of common types to be shared between packages like `@truffle/dashboard-message-bus` and `@truffle/dashboard-message-bus-client`

## Installation

If you are building a package that needs to interface with the Dashboard or message bus, you can install this package from NPM.

```
npm install @truffle/dashboard-message-bus-common
```

```
yarn add @truffle/dashboard-message-bus-common
```

### Adding new message types

Right now there are very few message types. The most important one is `"provider"`, which sends RPC requests for the dashboard-provider. Other message types are `"invalidate"`, which can be sent to invalidate earlier messages, and `"log"`, which is sent by the message bus to send log messages over the wire. The interfaces of these messages are defined inside of this package, from where they can be imported by consumers.

To add additional message types, the interface for the new message type should be defined in this package under `lib/messages.ts`. To use these new messge formats, support needs to be added to any consuming packages such as `@truffle/dashboard` as well.
