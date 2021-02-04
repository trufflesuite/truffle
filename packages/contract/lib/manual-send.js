const debug = require("debug")("contract:manual-send");
const ethers = require("ethers");
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
  transaction = setUpParameters(params, web3);
  //now: if the from address is in the wallet, web3 will sign the transaction before
  //sending, so we have to account for that
  const account = web3.eth.accounts.wallet[transaction.from];
  let txHash, receipt;
  if (account) {
    debug("signing!");
    //must sign when sending
    const ethersWallet = new ethers.Wallet(
      account.privateKey,
      ethersProvider
    );
    try {
      //send transaction using ethers, then wait for it to be mined
      //this throws if Ganache has VM errors and it reverts
      //it also throws on revert more generally, but with a different error...
      receipt = await (
        await ethersWallet.sendTransaction(transaction)
      ).wait();
      receipt = translateReceipt(receipt);
      txHash = receipt.transactionHash;
    } catch (error) {
      ({ txHash, receipt } = handleError(error));
      //if Ganache error we won't have the receipt and will need
      //to get it separately
      if (!receipt) {
        receipt = await web3.eth.getTransactionReceipt(txHash);
      }
    }
  } else {
    //use eth_sendTransaction, no signing
    //(note: earlier I tried using getSigner().sendTransaction()
    //but it didn't work?)
    //send tx and get hash immediately
    debug("sending");
    try {
      //if Ganache has VM errors turned on, this will throw on revert
      txHash = await ethersProvider
        .getSigner(transaction.from)
        .sendUncheckedTransaction(transaction);
    } catch (error) {
      //but, we can get the txHash from the error
      //(this function also rethrows unexpected errors)
      ({ txHash } = handleError(error));
    }
    //wait for it to be mined
    debug("waiting");
    await ethersProvider.waitForTransaction(txHash);
    //get receipt via web3
    receipt = await web3.eth.getTransactionReceipt(txHash);
  }
  debug("txHash: %s", txHash);
  promiEvent.setTransactionHash(txHash); //this here is why I wrote this function @_@
  return await handleResult(receipt, transaction.to == null);
}

function handleError(error) {
  debug("error: %O", error);
  if (error.data && Object.keys(error.data).length === 3) {
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
  return transaction;
}

//translate the receipt to web3 format by converting BigNumbers
//(note: these are *ethers* BigNumbers) to numbers
function translateReceipt(receipt) {
  return Object.assign({},
    ...Object.entries(receipt).map(([key, value]) => ({
      [key]: ethers.BigNumber.isBigNumber(value)
        ? value.toNumber()
        : value
    }))
  );
}

module.exports = {
  sendTransactionManual
}
