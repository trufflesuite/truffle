var contract = require("@truffle/contract");
var content = require("./build/contracts/TokenDemo.json");
var web3js = require("web3");

var TokenDemo = contract(content);

async function getUserBalance() {
  // console.log(TokenDemo)
  // return

  let web3 = new web3js();
  web3.setProvider("http://127.0.0.1:7545");
  // console.log(web3)
  // return

  TokenDemo.setProvider("http://127.0.0.1:7545");
  let tc = await TokenDemo.deployed();

  let acs = await web3.eth.getAccounts();
  let balance = await tc.balanceOf.call(acs[0], { from: acs[0] });
  console.log(acs[0], "have balance:", balance.toString());
  // console.log(TokenDemo)
}

getUserBalance();
