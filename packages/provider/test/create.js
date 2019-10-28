const assert = require("assert");
const Ganache = require("ganache-core");
const Provider = require("../index");
const Web3 = require("web3");
const { Web3Shim, InterfaceAdapter } = require("@truffle/interface-adapter");

describe("Provider", function() {
  let server;
  const port = 12345;
  const host = "127.0.0.1";

  before("Initialize Ganache server", done => {
    server = Ganache.server({});
    server.listen(port, function(err) {
      assert.ifError(err);
      done();
    });
  });

  after("Shutdown Ganache", done => {
    server.close(done);
  });

  it("accepts host and port", async () => {
    const provider = Provider.create({ host, port });
    assert(provider);

    const interfaceAdapter = new InterfaceAdapter();
    const web3Shim = new Web3Shim({ provider });

    try {
      await Provider.testConnection(web3Shim);
    } catch (error) {
      assert.fail(error.message);
    }
  });

  it("fails to connect to the wrong port", async () => {
    const provider = Provider.create({ host, port: "54321" });
    const interfaceAdapter = new InterfaceAdapter();
    const web3Shim = new Web3Shim({ provider });

    try {
      await Provider.testConnection(web3Shim);
      assert(false);
    } catch (error) {
      const snippet = `Could not connect to your Ethereum client`;
      if (error.message.includes(snippet)) {
        assert(true);
      } else {
        assert.fail("There was an error testing the provider.");
      }
    }
  });

  it("accepts a provider instance", async () => {
    const provider = Provider.create({
      provider: new Ganache.provider()
    });
    const interfaceAdapter = new InterfaceAdapter();
    const web3Shim = new Web3Shim({ provider });

    try {
      await Provider.testConnection(web3Shim);
      assert(provider);
    } catch (error) {
      assert.fail("There was an error testing the provider.");
    }
  });

  it("accepts a function that returns a provider instance", async () => {
    const provider = Provider.create({
      provider: function() {
        return new Ganache.provider();
      }
    });
    const interfaceAdapter = new InterfaceAdapter();
    const web3Shim = new Web3Shim({ provider });

    try {
      await Provider.testConnection(web3Shim);
      assert(provider);
    } catch (error) {
      assert.fail("There was an error testing the provider.");
    }
  });

  it("fails when given a bogus provider url", async () => {
    const provider = Provider.create({
      provider: new Web3.providers.HttpProvider("http://127.0.0.1:9999")
    });
    const interfaceAdapter = new InterfaceAdapter();
    const web3Shim = new Web3Shim({ provider });

    try {
      await Provider.testConnection(web3Shim);
      assert.fail(
        "The provider was instantiated correctly. That shouldn't have happened"
      );
    } catch (error) {
      const snippet = `Could not connect to your Ethereum client`;
      if (error.message.includes(snippet)) {
        assert(true);
      } else {
        assert.fail(`While testing the provider, got an error - ${error}.`);
      }
    }
  });
});
