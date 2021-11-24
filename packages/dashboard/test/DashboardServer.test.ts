import Ganache from "ganache-core";
import { providers, utils } from "ethers";
import Web3 from "web3";
import { getMessageBusPorts } from "@truffle/dashboard-message-bus";
import MockDashboard from "./MockDashboard";
import { DashboardServer } from "../lib";

jest.setTimeout(200000);

// TODO: These tests were copy-pasted from the browser-provider tests
// We should figure out whether we want to make this DRYer
describe("DashboardServer", () => {
  const ganachePort = 8545;
  const dashboardPort = 8546;
  const rpcUrl = `http://localhost:${dashboardPort}/rpc`;

  let dashboardServer: DashboardServer;
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
    dashboardServer = new DashboardServer({
      port: dashboardPort,
      autoOpen: false
    });

    await dashboardServer.start();

    mockDashboard = new MockDashboard(ganacheServer.provider);
    messageBusPorts = await getMessageBusPorts(dashboardPort);
  });

  afterEach(async () => {
    mockDashboard.disconnect();
    await dashboardServer.stop();
  });

  describe("Usage with Ethers.js", () => {
    let ethersProvider: providers.JsonRpcProvider;

    beforeEach(() => {
      ethersProvider = new providers.JsonRpcProvider(rpcUrl);
    });

    afterEach(async () => {
      // Ethers sends a request to get the chainId on connection, so we await it
      // to make sure that the provider is finished with that request as well
      await ethersProvider.ready;
    });

    it("should retrieve unlocked accounts", async () => {
      // First connect the dashboard
      await mockDashboard.connect(messageBusPorts.subscribePort);

      // Then send the request
      const accounts = await ethersProvider.listAccounts();

      expect(accounts[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      const request = ethersProvider.listAccounts();

      // Then connect the dashboard
      await mockDashboard.connect(messageBusPorts.subscribePort);

      // Then await the response
      const accounts = await request;

      expect(accounts[0]).toBeDefined();
    });

    it("should send ETH", async () => {
      await mockDashboard.connect(messageBusPorts.subscribePort);

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
  });

  describe("Usage with Web3.js", () => {
    let web3: Web3;

    beforeEach(() => {
      web3 = new Web3(rpcUrl);
    });

    it("should retrieve unlocked accounts", async () => {
      // First connect the dashboard
      await mockDashboard.connect(messageBusPorts.subscribePort);

      // Then send the request
      const accounts = await web3.eth.getAccounts();

      expect(accounts[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      const request = web3.eth.getAccounts();

      // Then connect the dashboard
      await mockDashboard.connect(messageBusPorts.subscribePort);

      // Then await the response
      const accounts = await request;

      expect(accounts[0]).toBeDefined();
    });

    it("should send ETH", async () => {
      await mockDashboard.connect(messageBusPorts.subscribePort);

      const accounts = await web3.eth.getAccounts();
      const response = await web3.eth.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: web3.utils.toWei("0.1")
      });

      expect(response).toHaveProperty("transactionHash");
      expect(response.transactionHash).toBeDefined();
    });
  });
});
