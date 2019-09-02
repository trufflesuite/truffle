var contract = require("@truffle/contract");

var Schema = require("../index.js");
var assert = require("assert");

var MetaCoin = require("./MetaCoin.json");

describe("networks", function() {
  var MetaCoinContract;

  before(() => {
    MetaCoinContract = contract(MetaCoin);
    MetaCoinContract.setNetwork(9999);
    MetaCoinContract.address = "0x1111111111111111111111111111111111111111";
    MetaCoinContract.transactionHash =
      "0x1111111111111111111111111111111111111111111111111111111111111111";
  });

  it("normalized has correct events", function() {
    var normalized = Schema.normalize(MetaCoinContract);
    assert.deepEqual(normalized.networks, {
      "9999": {
        address: "0x1111111111111111111111111111111111111111",
        events: {
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: "_from",
                type: "address"
              },
              {
                indexed: true,
                name: "_to",
                type: "address"
              },
              {
                indexed: false,
                name: "_value",
                type: "uint256"
              }
            ],
            name: "Transfer",
            type: "event"
          }
        },
        links: {},
        transactionHash:
          "0x1111111111111111111111111111111111111111111111111111111111111111"
      }
    });
  });
});
