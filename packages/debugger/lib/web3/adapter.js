import debugModule from "debug";
const debug = debugModule("debugger:web3:adapter");

import Web3 from "web3";
import * as Codec from "@truffle/codec";
import ENS, { getEnsAddress } from "@ensdomains/ensjs";
import { promisify } from "util";

export default class Web3Adapter {
  constructor(provider, ensOptions) {
    this.web3 = new Web3(provider);
    this.ensRegistryAddress = ensOptions.registryAddress; //note: may be null to turn off resolution
  }

  async init() {
    debug("initting; registry = %o", this.ensRegistryAddress);
    if (this.ensRegistryAddress === undefined) {
      const networkId = await this.web3.eth.net.getId();
      this.ensRegistryAddress = getEnsAddress(networkId);
    }
    if (this.ensRegistryAddress) {
      //not an else! can be set up above!
      debug("setting up");
      this.ens = new ENS({
        provider: this.web3.currentProvider,
        ensAddress: this.ensRegistryAddress
      });
    }
  }

  async getTrace(txHash) {
    const provider = this.web3.currentProvider;
    //send *only* uses callbacks, so we use promsifiy to make things more readable
    //we also use bind here to prevent a problem that sometimes occurs where
    //provider.send ends up unable to call its own methods because `this` gets
    //set incorrectly
    const result = await promisify(provider.send.bind(provider))({
      jsonrpc: "2.0",
      method: "debug_traceTransaction",
      id: Date.now(),
      params: [
        txHash,
        {
          enableMemory: true, //recent geth versions require this option
          disableStorage: true //we no longer use storage
        }
      ]
    });
    if (!result.result) {
      //we assume if there's no result then there is an error.
      //note: some nodes may return an error even if there is a
      //usable result, so we don't assume that the presence of
      //an error means we should throw an error, but rather check
      //for the absence of a result.
      throw new Error(result.error.message);
    } else {
      return result.result.structLogs;
    }
  }

  async getTransaction(txHash) {
    return await this.web3.eth.getTransaction(txHash);
  }

  async getReceipt(txHash) {
    return await this.web3.eth.getTransactionReceipt(txHash);
  }

  async getBlock(blockNumberOrHash) {
    return await this.web3.eth.getBlock(blockNumberOrHash);
  }

  async getChainId() {
    return await this.web3.eth.getChainId();
  }

  async getExistingStorage(address, slot, blockHash, txIndex) {
    debug("slot: %O", slot);
    const provider = this.web3.currentProvider;
    const hashedSlot = Web3.utils.soliditySha3({
      type: "bytes",
      value: slot
    });
    //note: see comment in getTrace for why we do this thing with bind
    const result = await promisify(provider.send.bind(provider))({
      jsonrpc: "2.0",
      method: "debug_storageRangeAt",
      id: Date.now(),
      params: [
        blockHash,
        txIndex,
        address,
        hashedSlot,
        1 //we only want the one slot
      ]
    });
    //again, see above for an explanation of the logic here
    if (result.result) {
      const storage = result.result.storage;
      debug("hashedSlot: %O", hashedSlot);
      debug("storage: %O", storage);
      debug("found? %O", hashedSlot in storage);
      if (hashedSlot in storage) {
        return storage[hashedSlot].value;
      } else {
        const zeroWord = "0x" + "00".repeat(Codec.Evm.Utils.WORD_SIZE);
        return zeroWord;
      }
    } else {
      throw new Error(result.error.message);
    }
  }

  /**
   * getDeployedCode - get the deployed code for an address from the client
   * NOTE: the block argument is optional
   * @param  {String} address
   * @return {String}         deployedBinary
   */
  async getDeployedCode(address, block) {
    debug("getting deployed code for %s", address);
    let code = await this.web3.eth.getCode(address, block);
    return code === "0x0" ? "0x" : code;
  }

  async reverseEnsResolve(address) {
    if (!this.ens) {
      debug("no ens you fool!");
      return null;
    }
    try {
      debug("addr: %s", address);
      //unfortunately, ensjs will throw on invalid UTF-8
      //and we really don't want this erroring... so we'll just swallow it,
      //sorry :-/
      return (await this.ens.getName(address)).name;
    } catch {
      return null;
    }
  }

  async ensResolve(name) {
    if (!this.ens) {
      return null;
    }
    try {
      //unfortunately, ensjs will error if the name contains certain characters
      //that aren't allowed in domain names.
      //and again, we really don't want this erroring, so we swallow it, sorry :-/
      return await this.ens.name(name).getAddress();
    } catch {
      return null;
    }
  }
}
