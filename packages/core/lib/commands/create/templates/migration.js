const Example = artifacts.require("Example");
module.exports = function(deployer /*, network, accounts */) {
  //TODO: orchestrate you migration logic using deployer.deploy
  deployer.deploy(Example);
};
