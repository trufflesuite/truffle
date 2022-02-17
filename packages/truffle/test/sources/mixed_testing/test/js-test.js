const StrangeEventTest = artifacts.require("StrangeEventTest");

contract("StrangeEventTest", function () {
  it("should emit a strange event", async function () {
    const instance = await StrangeEventTest.deployed();
    await instance.run();
  });
});
