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
  const requestsPort = 12345;
  const listenPort = 23456;

  let messageBus: DashboardMessageBus;
  let client: WebSocket;
  let listener: WebSocket;

  beforeEach(async () => {
    messageBus = new DashboardMessageBus(requestsPort, listenPort);
    await messageBus.start();
    client = await connectToMessageBusWithRetries(requestsPort);
    listener = await connectToMessageBusWithRetries(listenPort);
  });

  afterEach(() => {
    client.close();
    listener.close();
  });

  it("should send a message between a client and listener", async () => {
    listener.on("message", (data: string) => {
      const request = base64ToJson(data);
      const response = { ...request, payload: "response" };
      listener.send(jsonToBase64(response));
    });

    const response = await sendAndAwait(client, {
      id: 1,
      type: "test",
      payload: "request"
    });

    expect(response).toHaveProperty("payload");
    expect(response.payload).toEqual("response");
  });

  it.todo("should send a message to multiple listeners");
  it.todo("should send unfulfilled requests to new listeners");
  it.todo("should clear client's unfulfilled requests when client disconnects");
});
