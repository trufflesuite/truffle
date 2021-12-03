const debug = require("debug")("contract:manual-send");
const ethers = require("ethers");
const Utils = require ("./utils");
const { formatters } = require("web3-core-helpers"); //used for reproducing web3's behavior

//this is less manual now, it uses ethers, whew
//(it's still more manual than using web3)
async function sendTransactionManual(web3, params, promiEvent) {
  debug("executing manually!");
  //set up ethers provider
  const ethersProvider = new ethers.providers.Web3Provider(
    web3.currentProvider
  );
  //let's clone params and set it up properly
  const { transaction, from } = setUpParameters(params, web3);
  //now: if the from address is in the wallet, web3 will sign the transaction before
  //sending, so we have to account for that
  const account = web3.eth.accounts.wallet[from];
  const ethersSigner = account
    ? new ethers.Wallet(account.privateKey, ethersProvider)
    : ethersProvider.getSigner(from);
  debug("got signer");
  let txHash, receipt, ethersResponse;
  try {
    //note: the following code won't work with ethers v5.
    //wth ethers v5, in the getSigner() case, you'll need to
    //use sendUncheckedTransaction instead of sendTransaction.
    //I don't know why.
    ethersResponse = await ethersSigner.sendTransaction(transaction);
    txHash = ethersResponse.hash;
    receipt = await ethersProvider.waitForTransaction(txHash);
    debug("no error");
  } catch (error) {
    ({ txHash, receipt } = handleError(error));
    if (!receipt) {
      receipt = await ethersProvider.waitForTransaction(txHash);
    }
  }
  debug("txHash: %s", txHash);
  receipt = translateReceipt(receipt);
  promiEvent.setTransactionHash(txHash); //this here is why I wrote this function @_@
  return await handleResult(receipt, transaction.to == null);
}

function handleError(error) {
  debug("error: %O", error);
  if (error.data && error.data.hash) {
    //ganache v7.x
    return { txHash: error.data.hash };
  } else if (error.data && Object.keys(error.data).length === 3) {
    //ganache v2.x
    //error.data will have 3 keys: stack, name, and the txHash
    const transactionHash = Object.keys(error.data).find(
      key => key !== "stack" && key !== "name"
    );
    return { txHash: transactionHash };
  } else if (error.transactionHash && error.receipt) {
    return {
      txHash: error.transactionHash,
      receipt: error.receipt
    };
  } else {
    throw error; //rethrow unexpected errors
  }
}

async function handleResult(receipt, isDeployment) {
  const deploymentFailedMessage = "The contract code couldn't be stored, please check your gas limit.";
  if (receipt.status) {
    if (isDeployment) {
      //in the deployment case, web3 might error even when technically successful @_@
      if ((await web3.eth.getCode(receipt.contractAddress)) === "0x") {
        throw new Error(deploymentFailedMessage);
      }
    }
    return receipt;
  } else {
    //otherwise: we have to mimic web3's errors @_@
    if (isDeployment) {
      //deployment case
      throw new Error(deploymentFailedMessage);
    }
    throw new Error(
      "Transaction has been reverted by the EVM:" +
        "\n" +
        JSON.stringify(receipt)
    );
  }
}

function setUpParameters(params, web3) {
  let transaction = Object.assign({}, params);
  transaction.from =
    transaction.from != undefined
      ? transaction.from
      : web3.eth.defaultAccount;
  //now let's have web3 check our inputs
  transaction = formatters.inputTransactionFormatter(transaction); //warning, not a pure fn
  //...but ethers uses gasLimit instead of gas like web3
  transaction.gasLimit = transaction.gas;
  delete transaction.gas;
  //also, it insists "from" be kept separate
  const { from } = transaction;
  delete transaction.from;
  return { transaction, from }
}

//translate the receipt to web3 format by converting BigNumbers
//(note: these are *ethers* BigNumbers) to numbers
function translateReceipt(receipt) {
  return Object.assign({},
    ...Object.entries(receipt).map(([key, value]) => ({
      [key]: Utils.is_big_number(value)
        ? value.toNumber()
        : value
    }))
  );
}

module.exports = {
  sendTransactionManual
}
