const Example = artifacts.require("Example");

module.exports = async function(deployer, network, accounts) {
  const emptyAccount = accounts[7];
  console.log("the empty account -- %o", emptyAccount);
  let balance = await web3.eth.getBalance(emptyAccount);
  console.log("the balance -- %o", balance);
  const { baseFeePerGas } = await web3.eth.getBlock("latest");
  console.log("the base fee -- %o", baseFeePerGas);
  // 21,000 gas to send ether
  const priceOfGas = 21000 * baseFeePerGas;

  await web3.eth.sendTransaction({
    to: accounts[0],
    from: emptyAccount,
    value: balance - priceOfGas,
    gasPrice: baseFeePerGas
  });
  console.log("about to try and deploy");

  await deployer.deploy(Example, { from: emptyAccount, });
};
