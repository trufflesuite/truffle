const web3 = require('web3');

const IsLibrary = artifacts.require("IsLibrary");
const UsesExample = artifacts.require("UsesExample");
const UsesLibrary = artifacts.require("UsesLibrary");
const PayableExample = artifacts.require("PayableExample");

module.exports = async function(deployer) {
  await deployer.deploy(IsLibrary);
  await deployer.link(IsLibrary, UsesLibrary);
  await deployer.deploy(UsesExample, IsLibrary.address);
  await deployer.deploy(UsesLibrary);
  await deployer.deploy(PayableExample, {value: web3.utils.toWei('1', 'ether')});
};
