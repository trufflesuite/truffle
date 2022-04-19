const SimpleContract = artifacts.require("SimpleContract");

contract("SimpleContract", function () {
  it("should have an address once deployed", async function () {
    const instance = await SimpleContract.deployed();
    assert.isAddress(instance.address);
  });
});
