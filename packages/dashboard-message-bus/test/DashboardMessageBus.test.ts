import {
  base64ToJson,
  connectToMessageBusWithRetries,
  DashboardMessageBus,
  jsonToBase64,
  sendAndAwait
} from "../lib";
import WebSocket from "ws";

jest.setTimeout(2000000);

describe("DashboardMessageBus", () => {
  const publishPort = 12345;
  const subscribePort = 23456;

  let messageBus: DashboardMessageBus;
  let publisher: WebSocket;
  let subscriber: WebSocket;

  beforeEach(async () => {
    messageBus = new DashboardMessageBus(publishPort, subscribePort);
    await messageBus.start();
    publisher = await connectToMessageBusWithRetries(publishPort);
    subscriber = await connectToMessageBusWithRetries(subscribePort);
    subscriber.send("ready");
  });

  afterEach(() => {
    publisher.close();
    subscriber.close();
  });

  it("should send a message between a publisher and subscriber", async () => {
    subscriber.on("message", (data: string) => {
      const request = base64ToJson(data);
      const response = { ...request, payload: "response" };
      subscriber.send(jsonToBase64(response));
    });

    const response = await sendAndAwait(publisher, {
      id: 1,
      type: "test",
      payload: "request"
    });

    expect(response).toHaveProperty("payload");
    expect(response.payload).toEqual("response");
  });

  it.todo("should send a message to multiple subscribers");
  it.todo("should send unfulfilled requests to new subscribers");
  it.todo("should clear publisher's unfulfilled requests when publisher disconnects");
});
