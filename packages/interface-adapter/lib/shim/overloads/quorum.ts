import { Web3Shim } from "..";
import type { EvmTransaction, Mutable } from "../../adapter/types";
import { AbiCoder as EthersAbi, ParamType } from "ethers/utils/abi-coder";
import { ETH_DATA_FORMAT, eth } from "web3";

export const QuorumDefinition = {
  async initNetworkType(web3: Web3Shim) {
    // duck punch some of web3's output formatters
    overrides.getBlock(web3);
    overrides.getTransaction(web3);
    overrides.getTransactionReceipt(web3);
    overrides.decodeParameters(web3);
  }
};

const overrides = {
  // The ts-ignores are ignoring the checks that are
  // saying that web3.eth.getBlock is a function and doesn't
  // have a `method` property, which it does
  getBlock: (web3: Web3Shim) => {
    const _oldGetBlock = web3.eth.getBlock;
    web3.eth.getBlock = async (blockNumberOrTag: any, hydrated = false) => {
      let block = await _oldGetBlock.call(
        web3,
        blockNumberOrTag,
        hydrated,
        ETH_DATA_FORMAT
      );

      // TODO: double check why the following does not apply with web3.js 4.x.
      //  (if the following is used, then the related test will fail)
      // // Quorum uses nanoseconds instead of seconds in timestamp
      // let timestamp = block.timestamp / BigInt(10 ** 9);
      // block.timestamp = "0x" + timestamp.toString(16);

      // Since we're overwriting the gasLimit/Used later,
      // it doesn't matter what it is before the call
      // The same applies to the timestamp, but I reduced
      // the precision since there was an accurate representation
      // We do this because Quorum can have large block/transaction
      // gas limits
      block.gasLimit = "0x0";
      block.gasUsed = "0x0";
      return block;
    };
  },

  getTransaction: (web3: Web3Shim) => {
    const _oldGetTransaction = web3.eth.getTransaction;

    web3.eth.getTransaction = (tx: Mutable<EvmTransaction> | any) => {
      const _oldGas = tx.gas;

      tx.gas = "0x0";

      let result = _oldGetTransaction.call(web3, tx, ETH_DATA_FORMAT);

      // Perhaps there is a better method of doing this,
      // but the raw hexstrings work for the time being
      result.gas = _oldGas;

      return result;
    };
  },

  getTransactionReceipt: (web3: Web3Shim) => {
    const _oldGetTransactionReceipt = web3.eth.getTransactionReceipt;

    web3.eth.getTransactionReceipt = (receipt: any) => {
      const _oldGasUsed = receipt.gasUsed;

      receipt.gasUsed = "0x0";

      let result = _oldGetTransactionReceipt.call(
        web3,
        receipt,
        ETH_DATA_FORMAT
      );

      // Perhaps there is a better method of doing this,
      // but the raw hexstrings work for the time being
      result.gasUsed = _oldGasUsed;

      return result;
    };
  },

  // The primary difference between this decodeParameters function and web3's
  // is that the 'Out of Gas?' zero/null bytes guard has been removed and any
  // falsy bytes are interpreted as a zero value.
  decodeParameters: (web3: Web3Shim) => {
    const _oldDecodeParameters = web3.eth.abi.decodeParameters;

    const ethersAbiCoder = new EthersAbi((type, value) => {
      if (
        type.match(/^u?int/) &&
        !Array.isArray(value) &&
        (typeof value !== "object" || value.constructor.name !== "BN")
      ) {
        return value.toString();
      }
      return value;
    });

    // result method
    function Result() {}

    const decodeParameters = (outputs: Array<any>, bytes: String) => {
      // if bytes is falsy, we'll pass 64 '0' bits to the ethers.js decoder.
      // the decoder will decode the 64 '0' bits as a 0 value.
      if (!bytes) bytes = "0".repeat(64);
      const res = ethersAbiCoder.decode(
        eth.abi.mapTypes(outputs) as (string | ParamType)[],
        `0x${bytes.replace(/0x/i, "")}`
      );
      //@ts-ignore complaint regarding Result method
      const returnValue = new Result();
      returnValue.__length__ = 0;

      outputs.forEach((output, i) => {
        let decodedValue = res[returnValue.__length__];
        decodedValue = decodedValue === "0x" ? null : decodedValue;

        returnValue[i] = decodedValue;

        // @ts-ignore object not having name key
        if (typeof output === "object" && output.name) {
          // @ts-ignore object not having name key
          returnValue[output.name] = decodedValue;
        }

        returnValue.__length__++;
      });

      return returnValue;
    };
    web3.eth.abi = { ...web3.eth.abi, decodeParameters };
  }
};
