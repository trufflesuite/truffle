import Ganache, { EthereumProvider } from "ganache";
import { providers, utils } from "ethers";
import Web3 from "web3";
import MockDashboard from "./MockDashboard";
import { DashboardServer } from "@truffle/dashboard";
import { DashboardMessageBusClientOptions } from "@truffle/dashboard-message-bus-client";

import debugModule from "debug";

const debug = debugModule("dashboard-message-bus-client:test");

jest.setTimeout(10000);

// TODO: These tests were copy-pasted from the browser-provider tests
// We should figure out whether we want to make this DRYer
describe("DashboardServer", () => {
  const dashboardPort = 8546;
  const rpcUrl = `http://localhost:${dashboardPort}/rpc`;

  let dashboardServer: DashboardServer;
  let mockDashboard: MockDashboard;
  let ganacheProvider: EthereumProvider;
  let clientOptions: DashboardMessageBusClientOptions;

  beforeAll(async () => {
    debug("beforeAll: starting ganache provider");
    ganacheProvider = Ganache.provider<"ethereum">({
      logging: { quiet: true }
    });
    debug("beforeAll: done");
  });

  afterAll(async () => {
    debug("afterAll: stopping ganache provider");
    await ganacheProvider.disconnect();
    debug("afterAll: done");
  });

  beforeEach(async () => {
    debug("beforeEach: creating dashboard server");
    dashboardServer = new DashboardServer({
      port: dashboardPort,
      autoOpen: false
    });

    debug("beforeEach: starting dashboard server");
    await dashboardServer.start();

    clientOptions = {
      host: "localhost",
      port: dashboardPort,
      subscribePort: dashboardServer.subscribePort,
      publishPort: dashboardServer.publishPort
    };

    debug("beforeEach: creating mockdashboard");
    mockDashboard = new MockDashboard(ganacheProvider);
    debug("beforeEach: done");
  });

  afterEach(async () => {
    debug("afterEach: stopping mockdashboard");
    await mockDashboard.disconnect();
    debug("afterEach: stopping dashboardserver");
    await dashboardServer.stop();
    debug("afterEach done");
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
      debug("test 1: connecting to dashboard");
      await mockDashboard.connect(clientOptions);

      // Then send the request
      debug("test 1: listing accounts");
      const accounts = await ethersProvider.listAccounts();

      debug("test 1: checks");
      expect(accounts[0]).toBeDefined();
      debug("test 1: done with test 1");
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      debug("test 2: listing accounts");
      const request = ethersProvider.listAccounts();

      // Then connect the dashboard
      debug("test 2: connecting to ");
      await mockDashboard.connect(clientOptions);

      // Then await the response
      debug("test 2: awaiting accounts");
      const accounts = await request;

      debug("test 2: checks");
      expect(accounts[0]).toBeDefined();
      debug("test 2: done");
    });

    it("should send ETH", async () => {
      debug("test 3: connecting mockdashboard");
      await mockDashboard.connect(clientOptions);

      debug("test 3: getting accounts");
      const accounts = await ethersProvider.listAccounts();
      const signer = ethersProvider.getSigner();

      debug("test 3: sending transaction");
      const response = await signer.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: utils.parseEther("0.1")
      });

      debug("test 3: checks");
      expect(response).toHaveProperty("hash");
      expect(response.hash).toBeDefined();
      debug("test 3: done");
    });
  });

  describe("Usage with Web3.js", () => {
    let web3: Web3;

    beforeEach(() => {
      debug("web3 beforeEach: setting up web3");
      web3 = new Web3(rpcUrl);
      debug("web3 beforeEach: done setting up web3");
    });

    afterEach(() => {
      if ((web3.currentProvider as any).reset) {
        debug("web3 afterEach: resetting provider");
        (web3.currentProvider as any).reset();
        debug("web3 afterEach: done resetting provider");
      }

      debug("web3 afterEach: setting provider to `null`");
      web3.setProvider(null);
      debug("web3 afterEach: done resetting provider");
    });

    it("should retrieve unlocked accounts", async () => {
      // First connect the dashboard
      debug("test4: mockdashboard connecting");
      await mockDashboard.connect(clientOptions);

      // Then send the request
      debug("test4: mockdashboard connected, getting accounts");
      const accounts = await web3.eth.getAccounts();

      debug("test4: checks");
      expect(accounts[0]).toBeDefined();
    });

    it("should retrieve unlocked accounts if request gets sent before dashboard connects", async () => {
      // First send the request
      debug("test5: call get accounts");
      const request = web3.eth.getAccounts();

      debug("test5: mockdashboard connecting");
      // Then connect the dashboard
      await mockDashboard.connect(clientOptions);

      debug("test5: await get accounts promise");
      // Then await the response
      const accounts = await request;

      debug("test5: checks");
      expect(accounts[0]).toBeDefined();
      debug("test5: done");
    });

    it("should send ETH", async () => {
      debug("test6: mockdashboard connecting");
      await mockDashboard.connect(clientOptions);

      debug("test6: get accounts");
      const accounts = await web3.eth.getAccounts();
      debug("test6: send transaction");
      const response = await web3.eth.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: web3.utils.toWei("0.1")
      });

      debug("test6: checks");
      expect(response).toHaveProperty("transactionHash");
      expect(response.transactionHash).toBeDefined();
      debug("test6: done");
    });
  });
});
