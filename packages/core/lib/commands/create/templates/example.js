const Example = artifacts.require("Example");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Example", function (/* accounts */) {
  it("should assert true", async function () {
    await Example.deployed();
    return assert.isTrue(true);
  });
});
