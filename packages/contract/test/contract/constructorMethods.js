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

describe("TruffleContract.defaults()", () => {
  it("sets instance class_defaults when not already set", () => {
    const freshTruffleContract = TruffleContract();
    freshTruffleContract.class_defaults = undefined;
    assert.deepStrictEqual(freshTruffleContract.defaults(), {});
  });
});

describe("TruffleContract.isDeployed()", () => {
  it("returns false when instance network_id not set", () => {
    const freshTruffleContract = TruffleContract();
    assert.strictEqual(freshTruffleContract.isDeployed(), false);
  });
});

describe("TruffleContract.detectNetwork()", () => {
  it("throws when provider not present", () => {
    const freshTruffleContract = TruffleContract();
    assert.rejects(
      async () => await freshTruffleContract.detectNetwork(),
      {
        name: "Error",
        message: /(Provider not set or invalid)/
      },
      "should have thrown!"
    );
  });
});

describe("TruffleContract.detectNetwork()", () => {
  it("throws when network not set and provider not present", () => {
    const freshTruffleContract = TruffleContract();
    assert.rejects(
      async () => await freshTruffleContract.detectNetwork(),
      {
        name: "Error",
        message: /(Provider not set or invalid)/
      },
      "should have thrown!"
    );
  });

  it("throws when network set and provider not present", async () => {
    const freshTruffleContract = TruffleContract();
    freshTruffleContract.network_id = 1234;
    freshTruffleContract.networks[freshTruffleContract.network_id] =
      "dummyNetwork";
    assert.rejects(
      async () => await freshTruffleContract.detectNetwork(),
      {
        name: "Error",
        message: /(Provider not set or invalid)/
      },
      "should have thrown!"
    );
  });
});

describe("TruffleContract.setNetwork()", () => {
  it("returns w/o setting network_id when passed falsy network_id", () => {
    const freshTruffleContract = TruffleContract();
    assert.strictEqual(freshTruffleContract.network_id, undefined);
    freshTruffleContract.setNetwork(null);
    assert.strictEqual(freshTruffleContract.network_id, undefined);
  });
});

describe("TruffleContract.setNetworkType()", () => {
  it("sets network_type on Web3Shim", () => {
    const freshTruffleContract = TruffleContract();
    // default Web3Shim networkType
    freshTruffleContract.setNetworkType("quorum");
    assert.strictEqual(freshTruffleContract.web3.networkType, "quorum");
  });
});

describe("TruffleContract.setWallet()", () => {
  it("sets wallet on Web3Shim", () => {
    const freshTruffleContract = TruffleContract();
    const mockWalletObj = {};
    freshTruffleContract.setWallet(mockWalletObj);
    assert.deepStrictEqual(
      freshTruffleContract.web3.eth.accounts.wallet,
      mockWalletObj
    );
  });
});

describe("TruffleContract.resetAddress()", () => {
  it("resets deployed contract instance address on current network to undefined", () => {
    const freshTruffleContract = TruffleContract();
    freshTruffleContract.network_id = 1234;
    freshTruffleContract.networks[freshTruffleContract.network_id] = {
      address: "0x1234"
    };
    assert.strictEqual(freshTruffleContract.network.address, "0x1234");
    freshTruffleContract.resetAddress();
    assert.strictEqual(freshTruffleContract.network.address, undefined);
  });
});

describe("TruffleContract.link()", () => {
  it("throws if passed an undeployed instance", () => {
    const freshTruffleContract = TruffleContract();
    const mockTruffleContract = TruffleContract();
    assert.throws(() => {
      freshTruffleContract.link(mockTruffleContract),
        {
          name: "Error",
          message: /Cannot link contract without an address/
        },
        "should have thrown!";
    });
  });

  it("links an object collection of library contracts", () => {
    const freshTruffleContract = TruffleContract();
    freshTruffleContract.network_id = 1234;
    freshTruffleContract.networks[freshTruffleContract.network_id] = {
      address: "0x1234"
    };
    const mockLibraryObj = { Library1: "0x4321", Library2: "0x4567" };
    freshTruffleContract.link(mockLibraryObj);
    assert.deepStrictEqual(freshTruffleContract.links, mockLibraryObj);
  });
});

describe("TruffleContract.clone()", () => {
  it("when passed a non-object, clones an instance and uses passed value as the network_id", () => {
    const freshTruffleContract = TruffleContract();
    const newNetworkID = "1234";
    const clonedTruffleContract = freshTruffleContract.clone(newNetworkID);
    assert.strictEqual(clonedTruffleContract.network_id, newNetworkID);
  });
});
