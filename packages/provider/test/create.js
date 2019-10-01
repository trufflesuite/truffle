const assert = require("assert");
const Ganache = require("ganache-core");
const Provider = require("../index");
const Web3 = require("web3");

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
    const provider = await Provider.create({ host, port });
    assert(provider);

    try {
      await Provider.testConnection(provider);
    } catch (error) {
      assert.ifError(error);
    }
  });

  it("fails to connect to the wrong port", async () => {
    try {
      await Provider.create({ host, port: "54321" });
      assert(false);
    } catch (error) {
      const snippet = `There was a problem connecting with the provider`;
      if (error.message.includes(snippet)) {
        assert(true);
      } else {
        assert.fail("There was an error testing the provider.");
      }
    }
  });

  it("accepts a provider instance", async () => {
    try {
      const provider = await Provider.create({
        provider: new Ganache.provider()
      });
      assert(provider);
    } catch (error) {
      assert.fail("There was an error testing the provider.");
    }
  });

  it("accepts a function that returns a provider instance", async () => {
    try {
      const provider = await Provider.create({
        provider: function() {
          return new Ganache.provider();
        }
      });
      assert(provider);
    } catch (error) {
      assert.fail("There was an error testing the provider.");
    }
  });

  it("fails when given a bogus provider url", async () => {
    try {
      await Provider.create({
        provider: new Web3.providers.HttpProvider("http://127.0.0.1:9999")
      });
      assert.fail(
        "The provider was instantiated correctly. That shouldn't have happened"
      );
    } catch (error) {
      const snippet = `There was a problem connecting with the provider`;
      if (error.message.includes(snippet)) {
        assert(true);
      } else {
        assert.fail(`While testing the provider, got an error - ${error}.`);
      }
    }
  });
});
