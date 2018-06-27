var TestRPC = require("ganache-cli");
var contract = require("truffle-contract");
var Deployer = require("../index");
var Web3 = require("web3");
var assert = require("assert");

var exec = require("../src/actions/exec");

describe("deployer", function() {
  var provider = TestRPC.provider();
  var web3 = new Web3(provider);

  // This is the solidity code for the example below:
  //
  // pragma solidity ^0.4.2;
  //
  // contract Example {
  //   uint public value;
  //   function Example(uint val) {
  //     value = val;
  //   }
  // }
  var bytecode = "0x6060604052346000576040516020806100a083398101604052515b60008190555b505b6070806100306000396000f300606060405263ffffffff60e060020a6000350416633fa4f24581146022575b6000565b34600057602c603e565b60408051918252519081900360200190f35b600054815600a165627a7a72305820dfffdf45e86020a86e43daa92ec94d27d0aeb23dd72888379769a5a35656dc7d0029";
  var abi = [{"constant":true,"inputs":[],"name":"value","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[{"name":"val","type":"uint256"}],"payable":false,"type":"constructor"}];

  var network_id;
  var accounts;

  before("get network id", function(done) {
    web3.version.getNetwork(function(err, id) {
      if (err) return done(err);
      network_id = id;
      done();
    });
  });

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    })
  });

  it("deploys a contract correctly", function() {
    var Example = contract({
      contract_name: "Example",
      unlinked_binary: bytecode,
      abi: abi
    });
    Example.setProvider(provider);

    var deployer = new Deployer({
      contracts: [Example],
      network: "test",
      network_id: network_id,
      provider: provider
    });

    var errored = false;

    try {
      var address = Example.address;
    } catch(e) {
      errored = true;
    }

    assert(errored, "Precondition: Example shouldn't have an address")

    Example.defaults({
      gas: 3141592,
      from: accounts[0]
    });

    deployer.deploy(Example, 1);

    return deployer.start().then(function() {
      assert.notEqual(Example.address, null);
    });
  });
});
