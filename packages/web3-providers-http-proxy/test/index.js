const Web3 = require("web3");
// const Contract = require("web3-eth-contract");

const web3 = new Web3();
const { HttpProvider, ethToConflux } = require("../src");
const provider = new HttpProvider("http://localhost:12539", {
  chainAdaptor: ethToConflux
});
web3.setProvider(provider);

// const address = "0x8c62dd1b55611b334abfa6eb326f263956831087";

// eslint-disable-next-line no-unused-vars
async function testProvider() {
  // test get block number
  let number = await web3.eth.getBlockNumber();
  console.log("current number", number);

  // set provider for all later instances to use
  // Contract.setProvider(provider);
  // var contract = new Contract(require('./abi.json'), address);

  // let result = await contract.methods.last_completed_migration().call();
  // console.log('result', result);
}

// helper method
function createRpcReq(payload) {
  payload.id = Date.now();
  payload.jsonrpc = "2.0";
  return payload;
}

function genRPCPayload(method, params = []) {
  return {
    id: Date.now(),
    jsonrpc: "2.0",
    method,
    params
  };
}

const MigrateByteCode =
  "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061019c806100606000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063445df0ac146100465780638da5cb5b14610064578063fdacd576146100ae575b600080fd5b61004e6100dc565b6040518082815260200191505060405180910390f35b61006c6100e2565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6100da600480360360208110156100c457600080fd5b8101908080359060200190929190505050610107565b005b60015481565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16141561016457806001819055505b5056fea265627a7a72315820a3a037d76a1c0e16bc9703bd5259a8ba890777889d751ec9944861b46a68da5564736f6c63430005100032";

exports.createRpcReq = createRpcReq;
exports.genRPCPayload = genRPCPayload;
exports.MigrateByteCode = MigrateByteCode;
