const Example = artifacts.require("Example");
const UsesExample = artifacts.require("UsesExample");

module.exports = function(deployer) {
  deployer
    .deploy(Example, { param1: "hello", param2: "world" })
    .then(() =>
      deployer.deploy(
        UsesExample,
        { param1: "hello", param2: "world" },
        Example.address
      )
    );
};
