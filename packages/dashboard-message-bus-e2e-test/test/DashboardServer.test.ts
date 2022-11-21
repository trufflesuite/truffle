import Ganache, { EthereumProvider } from "ganache";
import { providers, utils } from "ethers";
import Web3 from "web3";
import MockDashboard from "./MockDashboard";
import { DashboardServer } from "@truffle/dashboard";
import { DashboardMessageBusClientOptions } from "@truffle/dashboard-message-bus-client";

jest.setTimeout(10000);

// TODO: These tests were copy-pasted from the browser-provider tests
// We should figure out whether we want to make this DRYer
describe("DashboardServer", () => {
  const dashboardPort = 8546;
  const rpcUrl = `http://localhost:${dashboardPort}/rpc`;

  let dashboardServer: DashboardServer;
  let mockDashboard: MockDashboard;
  let ganacheProvider: EthereumProvider;
  let clientOptions: Partial<DashboardMessageBusClientOptions>;

  beforeAll(async () => {
    ganacheProvider = Ganache.provider<"ethereum">({
      logging: { quiet: true }
    });
  });

  afterAll(async () => {
    await ganacheProvider?.disconnect();
  });

  beforeEach(async () => {
    dashboardServer = new DashboardServer({
      port: dashboardPort,
      autoOpen: false
    });

    await dashboardServer.start();

    clientOptions = {
      host: "localhost",
      port: dashboardPort
    };

    mockDashboard = new MockDashboard(ganacheProvider);
  });

  afterEach(async () => {
    await mockDashboard.disconnect();
    await dashboardServer.stop();
  });

  describe("Usage with Ethers.js", () => {
    let ethersProvider: providers.JsonRpcProvider;

    beforeEach(() => {
      // IMPORTANT: don't drop the second argument from this, or else this suite
      // will hang on exit, sometimes for two minutes or longer.
      ethersProvider = new providers.JsonRpcProvider(rpcUrl, {
        name: "ganache",
        chainId: 1337
      });
    });

    it("should retrieve unlocked accounts", async () => {
      // First connect the dashboard
      await mockDashboard.connect(clientOptions);

      // Then send the request
      const accounts = await ethersProvider.listAccounts();

      expect(accounts[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      const request = ethersProvider.listAccounts();

      // Then connect the dashboard
      await mockDashboard.connect(clientOptions);

      // Then await the response
      const accounts = await request;

      expect(accounts[0]).toBeDefined();
    });

    it("should send ETH", async () => {
      await mockDashboard.connect(clientOptions);

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

    afterEach(() => {
      if ((web3.currentProvider as any).reset) {
        (web3.currentProvider as any).reset();
      }

      web3.setProvider(null);
    });

    it("should retrieve unlocked accounts", async () => {
      // First connect the dashboard
      await mockDashboard.connect(clientOptions);

      // Then send the request
      const accounts = await web3.eth.getAccounts();

      expect(accounts[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      const request = web3.eth.getAccounts();

      // Then connect the dashboard
      await mockDashboard.connect(clientOptions);

      // Then await the response
      const accounts = await request;

      expect(accounts[0]).toBeDefined();
    });

    it("should send ETH", async () => {
      await mockDashboard.connect(clientOptions);

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
