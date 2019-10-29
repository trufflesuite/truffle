const contract = require("@truffle/contract");
const Schema = require("../");
const assert = require("assert");
const MetaCoin = require("./MetaCoin.json");

describe("networkType", () => {
  const defaultNetworkType = "ethereum";
  const customSupportedNetworkType = "quorum";
  const MetaCoinContract = contract(MetaCoin);

  it("normalized has correct default networkType", () => {
    const normalized = Schema.normalize(MetaCoinContract);
    assert.deepEqual(normalized.networkType, defaultNetworkType);
  });

  it("normalized has correct custom supported networkType", () => {
    MetaCoinContract.networkType = customSupportedNetworkType;
    const normalized = Schema.normalize(MetaCoinContract);
    assert.deepEqual(normalized.networkType, customSupportedNetworkType);
  });
});
