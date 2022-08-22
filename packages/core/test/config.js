const { assert } = require("chai");
const WorkflowCompile = require("@truffle/workflow-compile").default;
const Ganache = require("ganache");
const provision = require("@truffle/provisioner");
const Config = require("@truffle/config");
const tmp = require("tmp");
const path = require("path");
const fse = require("fs-extra");
let tempDir, config;

describe("config", function () {
  const customRPCConfig = {
    gas: 90000,
    gasPrice: 2,
    from: "0x1234567890123456789012345678901234567890"
  };

  before(async function () {
    this.timeout(5000);
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    fse.copySync(path.join(__dirname, "sources/metacoin"), tempDir.name);
    config = new Config(undefined, tempDir.name);
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
          },
          logging: {
            quiet: true
          }
        })
      }
    };
    await WorkflowCompile.compileAndSave(
      config.with({
        quiet: true
      })
    );
  });

  after(function () {
    tempDir.removeCallback();
  });

  it("Provisioning contracts should set proper RPC values", function () {
    const contract = config.resolver.require("MetaCoin.sol");

    provision(contract, config);

    assert.deepEqual(contract.defaults(), customRPCConfig);
  });
}).timeout(10000);
