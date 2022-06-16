import { DashboardMessageBus } from "@truffle/dashboard-message-bus";
import {
  DashboardMessageBusClient,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";
import { Message } from "@truffle/dashboard-message-bus-common";

jest.setTimeout(2000000);

describe("DashboardMessageBus", () => {
  const publishPort = 12345;
  const subscribePort = 23456;

  let messageBus: DashboardMessageBus;
  let client: DashboardMessageBusClient;

  beforeEach(async () => {
    messageBus = new DashboardMessageBus(publishPort, subscribePort);
    await messageBus.start();
    client = new DashboardMessageBusClient({
      host: "localhost",
      subscribePort,
      publishPort,
      retryDelayMsec: 10
    });
  });

  afterEach(async () => {
    //await client.waitForOutstandingTasks();
    await client.close();
    await messageBus.terminate();
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
