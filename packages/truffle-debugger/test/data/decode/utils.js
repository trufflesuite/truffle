import debugModule from "debug";
const debug = debugModule("test:data:decode:utils");

import { assert } from "chai";

import { BigNumber } from "bignumber.js";
import * as utils from "lib/data/decode/utils";

describe("Utils", function() {
  describe("toBigNumber()", function() {
    it("returns correct value", function() {
      let bytes = [0xf5, 0xe2, 0xc5, 0x17];
      let expectedValue = new BigNumber("f5e2c517", 16);

      let result = utils.toBigNumber(bytes);

      assert.equal(result.toString(), expectedValue.toString());
    })
  });

  describe("toSignedBigNumber()", function() {
    it("returns correct negative value", function() {
      let bytes = [0xf5, 0xe2, 0xc5, 0x17];  // starts with 0b1
      let raw = new BigNumber("f5e2c517", 16);
      let bitfipped = new BigNumber(
        raw.toString(2)
          .replace(/0/g, "x")
          .replace(/1/g, "0")
          .replace(/x/g, "1"),
        2
      );

      let expectedValue = bitfipped.plus(1).negated();

      let result = utils.toSignedBigNumber(bytes);

      assert.equal(result.toString(), expectedValue.toString());
    });

    it("returns correct positive value", function() {
      let bytes = [0x05, 0xe2, 0xc5, 0x17]; // starts with 0b0
      let raw = new BigNumber("05e2c517", 16);
      let expectedValue = raw;

      let result = utils.toSignedBigNumber(bytes);

      assert.equal(result.toString(), expectedValue.toString());
    })
  });

  describe("toHexString()", function() {
    it("returns correct representation with full bytes", function() {
      // ie, 0x00 instead of 0x0
      assert.equal(utils.toHexString([0x05, 0x11]), "0x0511");
      assert.equal(utils.toHexString([0xff, 0x00, 0xff]), "0xff00ff");
    });

    it("allows removing leading zeroes", function() {
      assert.equal(utils.toHexString([0x00, 0x00, 0xcc], true), "0xcc");
    });
  });
});
