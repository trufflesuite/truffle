var assert = require("chai").assert;
var fs = require("fs-extra");
var glob = require("glob");
var { default: Box } = require("@truffle/box");
var WorkflowCompile = require("@truffle/workflow-compile");
var Ganache = require("ganache");
var provision = require("@truffle/provisioner");
var Resolver = require("@truffle/resolver");
var Artifactor = require("@truffle/artifactor");

describe("config", function () {
  var config;
  var customRPCConfig = {
    gas: 90000,
    gasPrice: 2,
    from: "0x1234567890123456789012345678901234567890"
  };

  before("Create a sandbox with extra config values", async function () {
    this.timeout(5000);
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.network = "development";
    config.networks = {
      development: {
        network_id: "1",
        gas: customRPCConfig.gas,
        gasPrice: customRPCConfig.gasPrice,
        from: "0x1234567890123456789012345678901234567890",
        provider: Ganache.provider({
          miner: {
            instamine: "strict"
          }
        })
      }
    };
  });

  before("Compile contracts", async function () {
    this.timeout(10000);
    await WorkflowCompile.compileAndSave(
      config.with({
        quiet: true
      })
    );
  });

  after("Cleanup tmp files", function (done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  it("Provisioning contracts should set proper RPC values", function () {
    var contract = config.resolver.require("MetaCoin.sol");

    provision(contract, config);

    assert.deepEqual(contract.defaults(), customRPCConfig);
  });
}).timeout(10000);
