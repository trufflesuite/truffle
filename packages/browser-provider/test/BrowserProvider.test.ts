import { promisify } from "util";
import delay from "delay";
import Ganache from "ganache-core";
import { providers } from "ethers";
import Web3 from "web3";
import { BrowserProvider } from "../lib";
import MockDashboard from "./MockDashboard";
import { getMessageBusPorts } from "../lib/utils";

jest.setTimeout(200000);

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

  describe("Direct usage", () => {
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

  describe("Usage with Ethers.js", () => {
    let ethersProvider: providers.Web3Provider;

    beforeEach(() => {
      ethersProvider = new providers.Web3Provider(browserProvider);
    });

    afterEach(async () => {
      // Ethers sends a request to get the chainId on connection, so we await it
      // to make sure that the provider is finished with that request as well
      await ethersProvider.ready;
    });

    it("should retrieve unlocked accounts", async () => {
      // First connect the dashboard
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      // Then send the request
      const accounts = await ethersProvider.listAccounts();

      expect(accounts[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      const request = ethersProvider.listAccounts();

      // Wait for a second
      await delay(1000);

      // Then connect the dashboard
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      // Then await the response
      const accounts = await request;

      expect(accounts[0]).toBeDefined();
    });
  });

  describe("Usage with Web3.js", () => {
    let web3: Web3;

    beforeAll(() => {
      web3 = new Web3(browserProvider);
    });

    it("should retrieve unlocked accounts", async () => {
      // First connect the dashboard
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      // Then send the request
      const accounts = await web3.eth.getAccounts();

      expect(accounts[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      const request = web3.eth.getAccounts();

      // Wait for a second
      await delay(1000);

      // Then connect the dashboard
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      // Then await the response
      const accounts = await request;

      expect(accounts[0]).toBeDefined();
    });
  });
});
