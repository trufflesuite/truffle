const web3 = require("web3");

const Example = artifacts.require("Example");
const IsLibrary = artifacts.require("IsLibrary");
const UsesExample = artifacts.require("UsesExample");
const UsesLibrary = artifacts.require("UsesLibrary");
const PayableExample = artifacts.require("PayableExample");

module.exports = async function(deployer) {
  await deployer.deploy(Example, { param1: "hello", param2: "world" });
  await deployer.deploy(
    Example,
    { param1: "hello", param2: "world" },
    { overwrite: false }
  );

  await deployer.deploy(IsLibrary, { param1: "hello", param2: "world" });
  await deployer.link(IsLibrary, UsesLibrary);
  await deployer.deploy(
    UsesExample,
    { param1: "hello", param2: "world" },
    IsLibrary.address
  );
  await deployer.deploy(UsesLibrary, { param1: "hello", param2: "world" });

  await deployer.deploy(
    PayableExample,
    { param1: "hello", param2: "world" },
    {
      value: web3.utils.toWei("1", "ether")
    }
  );
};
