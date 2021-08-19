import { promisify } from "util";
import delay from "delay";
import Ganache from "ganache-core";
import { BrowserProvider } from "../lib";
import MockDashboard from "./MockDashboard";
import { getMessageBusPorts } from "../lib/utils";

jest.setTimeout(200000);

// TODO: Perhaps also add some tests where we're using this provider inside Ethers.js / web3.js
describe("BrowserProvider", () => {
  const ganachePort = 8545;
  const dashboardPort = 5000;

  let browserProvider: BrowserProvider;
  let mockDashboard: MockDashboard;
  let messageBusPorts: any;
  let ganacheServer: Ganache.Server;

  beforeAll(done => {
    ganacheServer = Ganache.server();
    ganacheServer.listen(ganachePort, done);
  });

  afterAll(done => {
    ganacheServer?.close(done);
  });

  beforeEach(async () => {
    mockDashboard = new MockDashboard(ganacheServer.provider);
    browserProvider = new BrowserProvider({ dashboardPort });
    messageBusPorts = await getMessageBusPorts(dashboardPort);
  });

  afterEach(() => {
    mockDashboard.disconnect();
  });

  it("should retrieve unlocked accounts", async () => {
    const send = promisify(browserProvider.send.bind(browserProvider));

    // First connect the dashboard
    await mockDashboard.connect(messageBusPorts.messageBusListenPort);

    // Then send the request
    const response = await send({
      jsonrpc: "2.0",
      method: "eth_accounts",
      params: [],
      id: 1
    });

    expect(response).toHaveProperty('result');
    expect(response?.result[0]).toBeDefined();
  });

  it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
    const send = promisify(browserProvider.send.bind(browserProvider));

    // First send the request
    const request = send({
      jsonrpc: "2.0",
      method: "eth_accounts",
      params: [],
      id: 1
    });

    // Wait for a second
    await delay(1000);

    // Then connect the dashboard
    await mockDashboard.connect(messageBusPorts.messageBusListenPort);

    // Then await the response
    const response = await request;

    expect(response).toHaveProperty('result');
    expect(response?.result[0]).toBeDefined();
  });
});
