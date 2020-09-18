const Example = artifacts.require("Example");

contract("Example", () => {
  it("should assert true", async () => {
    await Example.deployed();
    return assert.isTrue(true);
  });
});
