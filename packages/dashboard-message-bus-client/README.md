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

await client.sendMessage(message);
```

### Consuming and responding to messages

```ts
import { DashboardMessageBusClient } from "@truffle/dashboard-message-bus-client";

const client = new DashboardMessageBusClient({ port, host });

const timeoutMsec = 10000;

const messageIterator = client.getConsumer({
  type: "helloWorld",
  timeoutMsec: 1000
});

for await (const message: Message<HelloWorldPayload> of messageIterator) {
  console.log(`Hello ${message.payload.hello}`);
}
```
