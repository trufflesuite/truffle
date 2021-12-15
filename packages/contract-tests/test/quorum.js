const assert = require("chai").assert;
const util = require("./util");

describe("Quorum", function () {
  let Example;

  before(async function () {
    this.timeout(10000);

    Example = await util.createExample();

    return util.setUpProvider(Example);
  });

  it("privateFor accepted as valid tx_param (send)", async function () {
    const originalProvider = Example.currentProvider;
    const privateID = "ROAZBWtSacxXQrOe3FGAqJDyJjFePR5ce4TSIzmJ0Bc=";

    var transactionPayloads = [];

    var hookedProvider = {
      sendAsync: function () {
        const payload = arguments[0];

        if (payload.method == "eth_sendTransaction") {
          transactionPayloads.push(payload);
        }

        originalProvider.sendAsync.apply(originalProvider, arguments);
      }
    };

    Example.setProvider(hookedProvider);

    const example = await Example.new(1, {
      privateFor: [privateID]
    });
    await example.setValue(5, { privateFor: [privateID] });

    assert.equal(transactionPayloads.length, 2);

    transactionPayloads.forEach(payload => {
      assert.isNotNull(payload.params[0].privateFor);
      assert.equal(payload.params[0].privateFor[0], privateID);
    });
  });
});
