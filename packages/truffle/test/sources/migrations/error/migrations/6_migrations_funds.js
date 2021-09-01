const Example = artifacts.require("Example");

module.exports = async function(deployer, network, accounts) {
  const emptyAccount = accounts[7];
  console.log("the empty account -- %o", emptyAccount);
  let balance = await web3.eth.getBalance(emptyAccount);
  console.log("the balance -- %o", balance);

  await web3.eth.sendTransaction({
    to: accounts[0],
    from: emptyAccount,
    value: balance,
    gasPrice: 0
  });
  console.log("about to try and deploy");

  await deployer.deploy(Example, {from: emptyAccount});
};
