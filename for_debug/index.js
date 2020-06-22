#!/usr/bin/env node

require("../packages/core/cli");
// process.exit(0);

const Web3Shim = require("../packages/interface-adapter").Web3Shim;

// eslint-disable-next-line no-unused-vars
const cfxPromiEvent = require("../packages/interface-adapter/dist/shim/overloads/conflux")
  .cfxPromiEvent;
const Conflux = require("js-conflux-sdk").Conflux;
// packages/interface-adapter/dist/shim/overloads/conflux.js

// eslint-disable-next-line no-unused-vars
function sendTransactionUseWeb3shim() {
  const web3 = new Web3Shim({ networkType: "conflux" });
  const resultP = web3.eth.sendTransaction({
    from: "0x12be576f8eb81046c6f29f1801f39b75390fd760",
    to: "0x1A655f04d03f522e34f22e976A30294F4C83dEAd",
    value: "0x100"
  });
  resultP.then(r => console.log(r));
}

// eslint-disable-next-line no-unused-vars
function sendTransactionUseCfx() {
  const cfx = new Conflux({
    url: "http://localhost:12537"
    // @ts-ignore
    // logger: console
  });
  const txMsg = {
    from: "0x12be576f8eb81046c6f29f1801f39b75390fd760",
    to: "0x1A655f04d03f522e34f22e976A30294F4C83dEAd",
    value: "0x100"
  };
  let resultP = cfx.sendTransaction(txMsg, "hello");
  resultP
    .then(r => console.log("ok:", r))
    .catch(err => console.error("fail:", err));

  txMsg.to = "0x3A655f04d03f522e34f22e976A30294F4C83dEAd";
  resultP = cfx.sendTransaction(txMsg, "hello");
  resultP
    .then(r => console.log("ok:", r))
    .catch(err => console.error("fail:", err));
}

// eslint-disable-next-line no-unused-vars
function testConfluxAdapter() {
  const web3 = new Web3Shim({ networkType: "conflux" });
  cfxTx = {
    from: "0x12be576f8eb81046c6f29f1801f39b75390fd760",
    to: "0x1A655f04d03f522e34f22e976A30294F4C83dEAd",
    value: "0x100"
  };
  // let txhashP = web3.eth.sendTransaction(cfxTx, "hello");
  // txhashP.then(txhash => web3.eth.getTransactionReceipt(txhash));

  web3.eth
    .getTransactionReceipt(
      "0x95384e4f1007ad2184deaf2f8bcd6c551b0380bce0cb4dda5f363fe7cb424932"
    )
    .then(console.log);

  // const promiEvent = new cfxPromiEvent(txhashP, web3.eth);
  // promiEvent.then(rpt => console.log("receipt is:", rpt));
}
// testConfluxAdapter();
// sendTransactionUseCfx();
