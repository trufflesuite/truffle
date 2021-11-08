import { promisify } from "util";
import Ganache from "ganache-core";
import { providers, utils } from "ethers";
import Web3 from "web3";
import { getMessageBusPorts } from "@truffle/dashboard-message-bus";
import { DashboardProvider } from "../lib";
import MockDashboard from "./MockDashboard";

jest.setTimeout(200000);

describe("DashboardProvider", () => {
  const ganachePort = 8545;
  const dashboardPort = 8546;

  let dashboardProvider: DashboardProvider;
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
    dashboardProvider = new DashboardProvider({ dashboardPort, autoOpen: false });
    messageBusPorts = await getMessageBusPorts(dashboardPort);
  });

  afterEach(() => {
    mockDashboard.disconnect();
  });

  describe("Direct usage", () => {
    it("should retrieve unlocked accounts", async () => {
      const send = promisify(dashboardProvider.send.bind(dashboardProvider));

      // First connect the dashboard
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      // Then send the request
      const response = await send({
        jsonrpc: "2.0",
        method: "eth_accounts",
        params: [],
        id: 1
      });

      expect(response).toHaveProperty("result");
      expect(response?.result[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      const send = promisify(dashboardProvider.send.bind(dashboardProvider));

      // First send the request
      const request = send({
        jsonrpc: "2.0",
        method: "eth_accounts",
        params: [],
        id: 1
      });

      // Then connect the dashboard
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      // Then await the response
      const response = await request;

      expect(response).toHaveProperty("result");
      expect(response?.result[0]).toBeDefined();
    });

    it("should send ETH", async () => {
      const send = promisify(dashboardProvider.send.bind(dashboardProvider));

      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      const { result: accounts } =
        (await send({
          jsonrpc: "2.0",
          method: "eth_accounts",
          params: [],
          id: 1
        })) ?? {};

      const transaction = {
        from: accounts[0],
        to: accounts[1],
        value: "16345785D8A0000" // 0.1 ETH
      };

      const { result: hash } =
        (await send({
          jsonrpc: "2.0",
          method: "eth_sendTransaction",
          params: [transaction],
          id: 1
        })) ?? {};

      expect(hash).toBeDefined();
    });
  });

  describe("Usage with Ethers.js", () => {
    let ethersProvider: providers.Web3Provider;

    beforeEach(() => {
      ethersProvider = new providers.Web3Provider(dashboardProvider);
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
        value: utils.parseEther("0.1")
      });

      expect(response).toHaveProperty("hash");
      expect(response.hash).toBeDefined();
    });

    it("should send ETH even when dashboard loses connection as long as keepAlive is true", async () => {
      dashboardProvider.keepAlive = true;

      await mockDashboard.connect(messageBusPorts.messageBusListenPort);
      const accounts = await ethersProvider.listAccounts();

      // Disconnect + reconnect the dashboard between DashboardProvider requests
      mockDashboard.disconnect();
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      const signer = ethersProvider.getSigner();
      const response = await signer.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: utils.parseEther("0.1")
      });

      // Manually terminate the provider
      dashboardProvider.terminate();

      expect(response).toHaveProperty("hash");
      expect(response.hash).toBeDefined();
    });
  });

  describe("Usage with Web3.js", () => {
    let web3: Web3;

    beforeEach(() => {
      web3 = new Web3(dashboardProvider);
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
        value: web3.utils.toWei("0.1")
      });

      expect(response).toHaveProperty("transactionHash");
      expect(response.transactionHash).toBeDefined();
    });

    it("should send ETH even when dashboard loses connection as long as keepAlive is true", async () => {
      dashboardProvider.keepAlive = true;

      await mockDashboard.connect(messageBusPorts.messageBusListenPort);
      const accounts = await web3.eth.getAccounts();

      // Disconnect + reconnect the dashboard between DashboardProvider requests
      mockDashboard.disconnect();
      await mockDashboard.connect(messageBusPorts.messageBusListenPort);

      const response = await web3.eth.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: web3.utils.toWei("0.1")
      });

      // Manually terminate the provider
      dashboardProvider.terminate();

      expect(response).toHaveProperty("transactionHash");
      expect(response.transactionHash).toBeDefined();
    });
  });
});
