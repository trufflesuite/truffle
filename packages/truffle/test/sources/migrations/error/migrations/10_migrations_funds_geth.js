const Example = artifacts.require("Example");

module.exports = async function (deployer, network, accounts) {
  const notEnoughFunds = accounts[8];
  let balance = await web3.eth.getBalance(notEnoughFunds);
  const { baseFeePerGas } = await web3.eth.getBlock("latest");
  // 21,000 gas to send ether
  const priceOfGas = 21000 * baseFeePerGas;

  await web3.eth.sendTransaction({
    to: accounts[0],
    from: notEnoughFunds,
    // this value is an approximation of how much it will take to deplete funds
    value: "0x3634C9ADC5DE9FFFFF",
    gasPrice: baseFeePerGas
  });

  await deployer.deploy(Example, { from: notEnoughFunds });
};
