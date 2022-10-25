const MagicSquare = artifacts.require("./MagicSquare.sol");
const SquareLib = artifacts.require("./SquareLib.sol");
const VyperStorage = artifacts.require("./VyperStorage.sol");

module.exports = function (deployer) {
  deployer
    .then(function () {
      return deployer.deploy(VyperStorage);
    })
    .then(function () {
      return deployer.deploy(SquareLib);
    })
    .then(function () {
      deployer.link(SquareLib, MagicSquare);
      return deployer.deploy(MagicSquare);
    });
};
