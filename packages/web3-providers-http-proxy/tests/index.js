const Web3 = require("web3");
// const Contract = require("web3-eth-contract");

const web3 = new Web3();
const { HttpProvider, ethToConflux } = require("../src");
const provider = new HttpProvider("http://localhost:12539", {
  chainAdaptor: ethToConflux
});
web3.setProvider(provider);

// const address = "0x8c62dd1b55611b334abfa6eb326f263956831087";

(async function() {
  // test get block number
  let number = await web3.eth.getBlockNumber();
  console.log("current number", number);

  // set provider for all later instances to use
  // Contract.setProvider(provider);
  // var contract = new Contract(require('./abi.json'), address);

  // let result = await contract.methods.last_completed_migration().call();
  // console.log('result', result);
})();
