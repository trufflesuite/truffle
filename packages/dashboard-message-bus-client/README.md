# `@truffle/dashboard-message-bus-client`

This library is used for connecting with the message bus that powers the
Truffle dashboard.

## Usage

### Connecting to the message bus and producing a message

```ts
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";

const client = new DashboardMessageBusClient({ port, host });

const message = {
  type: "helloWorld",
  id: new DateTime().getTime(),
  payload: {
    hello: "world"
  }
};

const messageLifecycle = await client.publish(message);
```

#### The lifecycle of published messages

Publishing a message creates a lifecycle for that message. The lifecycle is tracked by the publisher as an object of type `PublishedMessageLifecycle<MessageType, ResponseType>`.

Publish message lifecycles terminate in one of three ways:

1. Receipt of a corresponding response message
2. Invalidation of the message
3. Abandonment of the message

##### Waiting for a response to a message

To enable request/response messaging (e.g. proxied JSON-RPC messages), publish
lifecycles contain a promise that resolves when a response to the originally
published message is received.

```ts
const response = await publishLifecycle.response;
```

##### Abandoning messages

To allow for fire-and-forget messages (e.g. event data), simply call the
`abandon` method on the lifecycle object.

**Important**: If the `abandon` method of the publish lifecycle is not called,
the process will hang forever on exit, as it will forever be waiting for a
response that will never arive.

```ts
await messageLifecycle.abandon();
```

##### Invalidating messages (aka message cancellation)

The consumer of a published message often will need to perform some longer
running operation as a result of that message. To cancel that work, or to
communicate to the consumer that the message is no longer valid, simply call
`cancel` on the publish lifecycle.

```ts
await messageLifecycle.invalidate();
```

### Consuming and responding to messages

Messages can be consumed by calling the `subscribe` method of the client. The
`subscribe` method returns a `DashboardMessageSubscription` object. This object
emits `message` events whenever messages are received that match the
subscription's filter.

Received messages are wrapped up in a lifecycle object similar to the one used for publishing messages, however there's only a single `respond` method.

```ts
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";

const client = new DashboardMessageBusClient({ port, host });

// omitting the type string in the options object will return a subscription
// for all messages
const subscription = client.subscribe({
  type: "helloWorld"
});

subscription.on("message", receivedMessageLifecycle => {
  const helloTarget = receivedMessageLifecycle.message.payload.hello;

  if (helloTarget.toLowerCase() === "world") {
    // respond by passing your response payload directly to the response
    await receivedMessageLifecycle.respond({
      someArbitraryResponse:
        "Why hello there. Pleased to make your acquaintance"
    });
  } else {
    await receivedMessageLifecycle.respond({
      error: `I'm sorry, you have the wrong number. This is world, not "${helloTarget}"`
    });
  }
});
```
