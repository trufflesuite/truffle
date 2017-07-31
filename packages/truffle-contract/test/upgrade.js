var contract = require("../");
var MetaCoin = require("./lib/MetaCoin.sol.js");
var assert = require("assert");
var _ = require("lodash");

describe("upgrading from soljs", function() {

  it("errors if a default network is specified and not ignored", function() {
    try {
      contract.fromSolJS(MetaCoin);
    } catch (e) {
      if (e.message.indexOf("MetaCoin has legacy 'default' network artifacts stored within it") != 0) {
        throw new Error("Unexpected error:" + e.stack);
      }
    }
  });

  it("can upgrade and keep all network artifacts intact", function() {
    var NewMetaCoin = contract.fromSolJS(MetaCoin, true);

    var abi = MetaCoin.abi;
    var binary = MetaCoin.unlinked_binary;

    var all_networks = _.cloneDeep(MetaCoin.all_networks);

    // Remove unused items from all_networks
    Object.keys(MetaCoin.all_networks).forEach(function(network_name) {
      delete all_networks[network_name].abi;
      delete all_networks[network_name].unlinked_binary;
    });

    // Delete the default network, as that'll get ignored.
    delete all_networks["default"];

    // Set the same networks (note: 12 comes from the .sol.js file itself)
    NewMetaCoin.setNetwork(12);
    MetaCoin.setNetwork(12);

    assert.deepEqual(NewMetaCoin.toJSON().networks, all_networks);
    assert.equal(NewMetaCoin.binary, MetaCoin.binary); // This covers links
    assert.deepEqual(NewMetaCoin.events, MetaCoin.events);
  });

});
