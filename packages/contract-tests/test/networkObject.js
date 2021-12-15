const assert = require("chai").assert;
const util = require("./util");

describe("Network Object [ @geth ]", function () {
  let Example;
  let networkId;

  it("errors when setting an invalid provider", function (done) {
    try {
      Example.setProvider(null);
      assert.fail("setProvider() should have thrown an error");
    } catch (e) {
      // Do nothing with the error.
    }
    done();
  });

  it("creates a network object when an address is set if no network specified", async function () {
    var NewExample = await util.createExample();

    const result = await util.setUpProvider(NewExample);
    networkId = await result.web3.eth.net.getId();

    assert.equal(NewExample.networkId, null);

    const example = await NewExample.new(1);
    // We have a network id in this case, with new(), since it was detected,
    // but no further configuration.
    assert.equal(NewExample.networkId, networkId);
    assert.equal(NewExample.toJSON().networks[networkId], null);

    NewExample.address = example.address;
    assert.equal(
      NewExample.toJSON().networks[networkId].address,
      example.address
    );
  });
});
