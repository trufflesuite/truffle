const { assert } = require("chai");
const util = require("./util");

describe("revert reasons", function() {
  let RevertingContract;
  const providerOptions = { vmErrorsOnRPCResponse: true }; // <--- TRUE

  before(async function() {
    this.timeout(10000);

    RevertingContract = await util.createRevertingContract();

    await util.setUpProvider(RevertingContract, providerOptions);
  });

  it("provides a reason when a function reverts", async () => {
    try {
      let instance = await RevertingContract.new();
      await instance.revertingFunction();
      assert.fail();
    } catch (error) {
      assert(error.reason, "Too reverty of a function");
    }
  });

  it("provides a reason when a view function (call) reverts", async () => {
    try {
      let instance = await RevertingContract.new();
      await instance.revertingView();
      assert.fail();
    } catch (error) {
      assert(error.reason, "Too reverty of a view");
    }
  });
});
