const assert = require("assert");
const Ganache = require("ganache");
const Provider = require("../index");
const Web3 = require("web3");
const promisify = require("util").promisify;
const ProviderError = require("../error");

describe("Provider", function () {
  let server;
  const port = 12345;
  const host = "127.0.0.1";

  before("Initialize Ganache server", done => {
    server = Ganache.server({
      miner: {
        instamine: "strict"
      },
      logging: {
        quiet: true
      }
    });
    server.listen(port, function (err) {
      assert.ifError(err);
      done();
    });
  });

  after("Shutdown Ganache", async () => {
    await server.close();
  });

  it("accepts host and port", async () => {
    const provider = Provider.create({ host, port });
    assert(provider);

    try {
      await Provider.testConnection({ provider });
    } catch (error) {
      assert.fail(error.message);
    }
  });

  it("accepts url", async () => {
    const provider = Provider.create({ url: `http://${host}:${port}` });
    assert(provider);

    try {
      await Provider.testConnection({ provider });
    } catch (error) {
      assert.fail(error.message);
    }
  });

  it("accepts uses url before host/port", async () => {
    const provider = Provider.create({
      url: `http://${host}:${port}`,
      host: "invalidhost",
      port: 42
    });
    assert(provider);

    try {
      await Provider.testConnection({ provider });
    } catch (error) {
      assert.fail(error.message);
    }
  });

  it("fails to connect to the wrong port", async () => {
    const provider = Provider.create({ host, port: "54321" });

    try {
      await Provider.testConnection({ provider });
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
      provider: Ganache.provider()
    });
    try {
      await Provider.testConnection({ provider });
      assert(provider);
    } catch (error) {
      assert.fail("There was an error testing the provider.");
    }
  });

  it("accepts a function that returns a provider instance", async () => {
    const provider = Provider.create({
      provider: function () {
        return Ganache.provider();
      }
    });
    try {
      await Provider.testConnection({ provider });
      assert(provider);
    } catch (error) {
      assert.fail("There was an error testing the provider.");
    }
  });

  it("fails when given a bogus provider url", async () => {
    const provider = Provider.create({
      provider: new Web3.providers.HttpProvider("http://127.0.0.1:9999")
    });

    try {
      await Provider.testConnection({ provider });
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

  describe("Events", () => {
    it("emits a rpc:request event when a request is sent", async () => {
      const emittedEvents = [];

      const provider = Provider.create({
        provider: _stubbedSuccessProvider(),
        events: _stubbedEventEmitter(emittedEvents)
      });

      await promisify(provider.send)(_stubbedPayload);

      assert.strictEqual(emittedEvents.length, 2);
      assert.strictEqual(emittedEvents[0].eventName, "rpc:request");
      assert.strictEqual(emittedEvents[0].args.length, 1);
      const { payload, error, result } = emittedEvents[0].args[0];
      assert.deepStrictEqual(payload, _stubbedPayload);
      assert.strictEqual(error, undefined);
      assert.strictEqual(result, undefined);
    });

    it("emits a successful rpc:result event when a successful response is received", async () => {
      const emittedEvents = [];

      const provider = Provider.create({
        provider: _stubbedSuccessProvider(),
        events: _stubbedEventEmitter(emittedEvents)
      });

      await promisify(provider.send)(_stubbedPayload);

      assert.strictEqual(emittedEvents.length, 2);
      assert.strictEqual(emittedEvents[1].eventName, "rpc:result");
      assert.strictEqual(emittedEvents[1].args.length, 1);

      const { payload, error, result } = emittedEvents[1].args[0];
      assert.deepStrictEqual(payload, _stubbedPayload);
      assert.deepStrictEqual(result, _stubbedSuccessResult(_stubbedPayload));
      assert.strictEqual(error, undefined);
    });

    it("emits a failed rpc:result event when a failed response is received", async () => {
      const emittedEvents = [];

      const provider = Provider.create({
        provider: _stubbedErrorProvider(),
        events: _stubbedEventEmitter(emittedEvents)
      });

      try {
        await promisify(provider.send)(_stubbedPayload);
      } catch (err) {
        assert.strictEqual(emittedEvents.length, 2);
        assert.strictEqual(emittedEvents[1].eventName, "rpc:result");
        assert.strictEqual(emittedEvents[1].args.length, 1);

        const { payload, error, result } = emittedEvents[1].args[0];

        assert.deepStrictEqual(payload, _stubbedPayload);

        assert.deepStrictEqual(error, err);
        const _stubbedRawError = _stubbedFailedResult(payload);
        assert.deepStrictEqual(error, new ProviderError(_stubbedRawError.error.message, { underlyingError: _stubbedRawError.error }));

        assert.strictEqual(result, undefined);
      }
    });

    function _stubbedSuccessProvider() {
      return {
        send: (payload, callback) => {
          callback(null, _stubbedSuccessResult(payload));
        }
      };
    }

    function _stubbedErrorProvider() {
      return {
        send: (payload, callback) => {
          callback(_stubbedFailedResult(payload).error, null);
        }
      };
    }

    function _stubbedSuccessResult(payload) {
      return {
        jsonrpc: "2.0",
        id: payload.id,
        result: "success"
      };
    }

    function _stubbedFailedResult(payload) {
      return {
        jsonrpc: "2.0",
        id: payload.id,
        error: {
          message: "Invalid Request",
          code: -32600
        }
      };
    }

    function _stubbedEventEmitter(emittedEvents) {
      return {
        emit: (eventName, ...args) => {
          emittedEvents.push({ eventName, args });
        }
      };
    }

    const _stubbedPayload = {
      id: new Date().getTime(),
      jsonrpc: "2.0",
      method: "fake_call",
      params: []
    };
  });
});
