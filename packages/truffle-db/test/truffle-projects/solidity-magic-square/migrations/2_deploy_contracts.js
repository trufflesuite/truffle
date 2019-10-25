var MagicSquare = artifacts.require("MagicSquare");
var SquareLib = artifacts.require("SquareLib");

module.exports = function(deployer) {
  deployer
    .then(function() {
      return deployer.deploy(SquareLib);
    })
    .then(function() {
      deployer.link(SquareLib, MagicSquare);
      return deployer.deploy(MagicSquare);
    });
};
