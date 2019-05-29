const TruffleContract = require("../../");
const assert = require("assert");
const Ganache = require("ganache-core");

describe("TruffleContract", () => {
  it("can be used to return an empty TruffleContract class object", () => {
    const emptyTruffleContract = TruffleContract();
    assert(emptyTruffleContract.name === "TruffleContract");
  });
});

describe("TruffleContract.new()", () => {
  it("throws if called before setting a provider", () => {
    const freshTruffleContract = TruffleContract();
    assert.throws(() => {
      freshTruffleContract.new();
    }, "should have thrown!");
  });

  it("throws if called on a contract instance with empty bytecode", () => {
    const provider = Ganache.provider();
    const freshTruffleContract = TruffleContract();
    freshTruffleContract.setProvider(provider);
    assert.throws(() => {
      freshTruffleContract.new();
    }, "should have thrown!");
  });
});

describe("TruffleContract.at()", () => {
  it("throws if passed an invalid address", () => {
    const freshTruffleContract = TruffleContract();
    assert.rejects(
      async () => {
        await freshTruffleContract.at();
      },
      {
        name: "Error",
        message: /(Invalid address passed)/
      },
      "should have thrown!"
    );

    assert.rejects(
      async () => {
        await freshTruffleContract.at(12345);
      },
      {
        name: "Error",
        message: /(Invalid address passed)/
      },
      "should have thrown!"
    );

    assert.rejects(
      async () => {
        await freshTruffleContract.at("0x000323332");
      },
      {
        name: "Error",
        message: /(Invalid address passed)/
      },
      "should have thrown!"
    );
  });
});

describe("TruffleContract.deployed()", () => {
  it("throws if called before setting a provider", () => {
    const freshTruffleContract = TruffleContract();
    assert.rejects(
      async () => {
        await freshTruffleContract.deployed();
      },
      {
        name: "Error",
        message: /(Please call setProvider\(\) first)/
      },
      "should have thrown!"
    );
  });

  it("throws if network & network record exists, but contract not deployed onchain", async () => {
    const provider = Ganache.provider();
    const freshTruffleContract = TruffleContract();
    freshTruffleContract.setProvider(provider);
    await freshTruffleContract.detectNetwork();
    freshTruffleContract.networks[freshTruffleContract.network_id] =
      "fakeNetworkRecord";
    assert.rejects(
      async () => {
        await freshTruffleContract.deployed();
      },
      {
        name: "Error",
        message: /(Contract).*(not).*(deployed to detected network)/
      },
      "should have thrown!"
    );
  });
});
