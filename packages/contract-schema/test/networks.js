const contract = require("@truffle/contract");

const Schema = require("../index.js");
const assert = require("assert");

const MetaCoin = require("./MetaCoin.json");

// This file has an invalid json schema for networks with extra `signature`
// property
const MetaCoinInvalid = require("./MetaCoin-invalid.json");

const validatedMetaCoin = {
  "69420": {
    address: "0x1111111111111111111111111111111111111111",
    events: {
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "_from",
            type: "address"
          },
          {
            indexed: true,
            internalType: "address",
            name: "_to",
            type: "address"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "_value",
            type: "uint256"
          }
        ],
        name: "Transfer",
        type: "event"
      }
    },
    links: {
      ConvertLib: "0xB5AF56dF69655d7a68d248EA963eD1416Dd053E2"
    },
    transactionHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111"
  }
};

const prepareContract = (contract, network) => {
  contract.setNetwork(network);
  contract.address = "0x1111111111111111111111111111111111111111";
  contract.transactionHash =
    "0x1111111111111111111111111111111111111111111111111111111111111111";
};

describe("networks", function() {
  let MetaCoinContractGood, MetaCoinContractBad;

  beforeEach(() => {
    MetaCoinContractGood = contract(MetaCoin);
    prepareContract(MetaCoinContractGood, 69420);

    MetaCoinContractBad = contract(MetaCoinInvalid);
    prepareContract(MetaCoinContractBad, 69420);
  });

  describe("normalized has correct events ", function() {
    it("when starting with valid events schema", function() {
      const normalized = Schema.normalize(MetaCoinContractGood);
      assert.deepEqual(normalized.networks, validatedMetaCoin);
    });

    it("when starting with invalid events schema", function() {
      const normalized = Schema.normalize(MetaCoinContractBad);
      assert.deepEqual(normalized.networks, validatedMetaCoin);
    });
  });
});
