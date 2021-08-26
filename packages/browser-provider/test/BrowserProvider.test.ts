import { promisify } from "util";
import delay from "delay";
import Ganache from "ganache-core";
import { providers, utils } from "ethers";
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

      await delay(1000);

      // Then connect the dashboard
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      // Then await the response
      const accounts = await request;

      expect(accounts[0]).toBeDefined();
    });

    it("should send ETH", async () => {
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      const accounts = await ethersProvider.listAccounts();
      const signer = ethersProvider.getSigner();
      const response = await signer.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: utils.parseEther("0.1"),
      });

      expect(response).toHaveProperty("hash");
      expect(response.hash).toBeDefined();
    });

    // TODO: This is failing because there is a window where disconnecting the
    // dashboard closes the entire message bus if that happens to be at a point
    // where there are no active browser provider requests
    it.skip("should send ETH when dashboard disconnects and reconnects", async () => {
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      const accounts = await ethersProvider.listAccounts();
      const signer = ethersProvider.getSigner();

      const request = signer.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: utils.parseEther("0.1"),
      });

      mockDashboard.disconnect();
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      const response = await request;

      expect(response).toHaveProperty("hash");
      expect(response.hash).toBeDefined();
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

    it("should send ETH", async () => {
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      const accounts = await web3.eth.getAccounts();
      const response = await web3.eth.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: web3.utils.toWei('0.1'),
      });

      expect(response).toHaveProperty("transactionHash");
      expect(response.transactionHash).toBeDefined();
    });
  });
});
