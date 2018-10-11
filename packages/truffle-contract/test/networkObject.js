var assert = require("chai").assert;
var BigNumber = require("bignumber.js");
var temp = require("temp").track();
var path = require("path");
var fs = require("fs");
var util = require('./util');
var contract = require("../");

describe("Network Object [ @geth ]", function() {
  var Example;
  var accounts;
  var network_id;
  var web3;
  var providerOptions = {vmErrorsOnRPCResponse: false};

  after(() => temp.cleanupSync());

  it("errors when setting an invalid provider", function(done) {
    try {
      Example.setProvider(null);
      assert.fail("setProvider() should have thrown an error");
    } catch (e) {
      // Do nothing with the error.
    }
    done();
  });

  it("creates a network object when an address is set if no network specified", async function() {
    var NewExample = util.createExample();

    const result = await util.setUpProvider(NewExample)
    network_id = await result.web3.eth.net.getId()

    assert.equal(NewExample.network_id, null);

    const example = await NewExample.new(1)
    // We have a network id in this case, with new(), since it was detected,
    // but no further configuration.
    assert.equal(NewExample.network_id, network_id);
    assert.equal(NewExample.toJSON().networks[network_id], null);

    NewExample.address = example.address;
    assert.equal(NewExample.toJSON().networks[network_id].address, example.address);
  });
});
