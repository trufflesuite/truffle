const Example = artifacts.require("Example");

module.exports = async function (deployer, network, accounts) {
  const emptyAccount = accounts[7];
  let balance = await web3.eth.getBalance(emptyAccount);
  const { baseFeePerGas } = await web3.eth.getBlock("latest");
  // This transaction drains `emptyAccount` of all funds
  // 21,000 gas to send ether
  const priceOfGas = 21000 * baseFeePerGas;

  await web3.eth.sendTransaction({
    to: accounts[0],
    from: emptyAccount,
    value: balance - priceOfGas,
    gasPrice: baseFeePerGas
  });

  await deployer.deploy(Example, { from: emptyAccount });
};
