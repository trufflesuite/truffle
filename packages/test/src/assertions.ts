import BN from "bn.js";

export default function (chai: any, _utils: any) {
  const assert = chai.assert;
  chai.Assertion.addProperty("address", function () {
    this.assert(
      this._obj.length === 42,
      "expected #{this} to be a 42 character address (0x...)",
      "expected #{this} to not be a 42 character address (0x...)"
    );

    // Convert address to a number. Make sure it's not zero.
    // Controversial: Technically there is that edge case where
    // all zeroes could be a valid address. But: This catches all
    // those cases where Ethereum returns 0x0000... if something fails.
    const number = new BN(this._obj);
    this.assert(
      !number.isZero(),
      "expected address #{this} to not be zero",
      "you shouldn't ever see this."
    );
  });
  assert.isAddress = function (val: string, _exp: string, msg: string) {
    return new chai.Assertion(val, msg).to.be.address;
  };
}
