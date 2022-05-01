const assert = require("chai").assert;
const { default: Box } = require("@truffle/box");
const { Environment } = require("@truffle/environment");
const sinon = require("sinon");

describe("Environment develop", function () {
  let config;

  const expectedNetwork = {
    port: 8545,
    network_id: 1342,
    gas: 90000
  };

  const testOptions = {
    port: 5678,
    network_id: expectedNetwork.network_id,
    gas: 7000
  };

  beforeEach("Create a sandbox", async function () {
    this.timeout(5000);
    config = await Box.sandbox("default");
    config.network = "network";
    config.networks = {
      network: {
        port: expectedNetwork.port,
        network_id: 4321,
        gas: expectedNetwork.gas
      }
    };
  });

  it("Environment.develop overwrites the network_id of the network", async function () {
    //Stub detect in order to prevent its executing during this test
    //which is invoked during `Environment.develop(..)`
    sinon.stub(Environment, "detect");
    await Environment.develop(config, testOptions);

    const mutatedNetwork = config.networks[config.network];
    assert.equal(
      mutatedNetwork.port,
      expectedNetwork.port,
      "The port of the network should be unchanged."
    );
    assert.equal(
      mutatedNetwork.network_id,
      expectedNetwork.network_id,
      "The network_id of the network should be overwritten."
    );
    assert.equal(
      mutatedNetwork.gas,
      expectedNetwork.gas,
      "The gas of the network should be unchanged."
    );

    //Restore `detect` functionality
    Environment.detect.restore();
  });
}).timeout(10000);
