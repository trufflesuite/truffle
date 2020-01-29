const Example = artifacts.require("Example");
const UsesExample = artifacts.require("UsesExample");

module.exports = function(deployer) {
  deployer
    .deploy(Example)
    .then(() => deployer.deploy(UsesExample, Example.address));
};
