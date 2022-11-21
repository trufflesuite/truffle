import { DashboardMessageBus } from "@truffle/dashboard-message-bus";
import {
  DashboardMessageBusClient,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";
import { Message } from "@truffle/dashboard-message-bus-common";
import { createServer } from "http";
import type { Server } from "http";

jest.setTimeout(10000);

describe("DashboardMessageBus", () => {
  const port = 12345;

  let messageBus: DashboardMessageBus;
  let client: DashboardMessageBusClient;
  let httpServers: Server[] = [];
  let httpServerClosePromises: Promise<void>[] = [];

  beforeEach(async () => {
    httpServers = [createServer(), createServer()];

    // used in afterEach to wait until the servers actually close
    httpServerClosePromises = httpServers.map(
      server => new Promise(resolve => server.once("close", resolve))
    );
    const listenPromises = httpServers.map(
      server => new Promise(resolve => server.once("listening", resolve))
    );

    httpServers[0].listen(port, "127.0.0.1");
    httpServers[1].listen(port, "::1");

    await Promise.all(listenPromises);

    messageBus = new DashboardMessageBus({ httpServers });

    messageBus.once("terminate", () => {
      httpServers.forEach(server => server.close());
    });

    await messageBus.start();
    client = new DashboardMessageBusClient({
      host: "localhost",
      port,
      retryDelayMsec: 10
    });
  });

  afterEach(async () => {
    await client.close();
    await messageBus.terminate();
    await Promise.all(httpServerClosePromises);
  });

  it("should send a message between a publisher and subscriber", async () => {
    await client.ready();

    // simulate publisher
    const publishLifecycle = await client.publish({
      type: "test",
      payload: "request"
    });

    const subscription = client.subscribe({
      type: "test"
    });

    const subscribeLifecycle = await new Promise<
      ReceivedMessageLifecycle<Message>
    >((resolve, reject) => {
      subscription.once("message", resolve);
      subscription.once("end", reject);
    });

    const consumedMessage = subscribeLifecycle.message;

    expect(consumedMessage).toHaveProperty("id");

    expect(consumedMessage).toHaveProperty("type");
    expect(consumedMessage.type).toStrictEqual("test");

    expect(consumedMessage).toHaveProperty("payload");
    expect(consumedMessage.payload).toStrictEqual("request");

    await subscribeLifecycle.respond({
      payload: "response"
    });

    const response = await publishLifecycle.response;

    expect(response).not.toBeNull();
    expect(response).toHaveProperty("id");

    expect(response?.id).toStrictEqual(consumedMessage.id);

    expect(response).not.toHaveProperty("type");

    expect(response).toHaveProperty("payload");
    expect(response?.payload).toStrictEqual("response");
  });

  it.todo("should send a message to multiple subscribers");
  it.todo("should send unfulfilled requests to new subscribers");
  it.todo(
    "should clear publisher's unfulfilled requests when publisher disconnects"
  );
});
