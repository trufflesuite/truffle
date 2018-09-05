import read from "../read";
import * as utils from "../utils";
import BN from "bn.js";
import { AstDefinition } from "../types/ast";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import Web3 from "web3";

export default async function decodeValue(definition: AstDefinition, pointer: DataPointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<undefined | boolean | BN | string> {
  const { state } = info;

  let bytes = await read(pointer, state, web3, contractAddress);
  if (bytes == undefined) {
    // debug("segfault, pointer %o, state: %O", pointer, state);
    return undefined;
  }

  switch (utils.Definition.typeClass(definition)) {
    case "bool":
      return !utils.Conversion.toBN(bytes).isZero();

    case "uint":
      return utils.Conversion.toBN(bytes);

    case "int":
      return utils.Conversion.toSignedBN(bytes);

    case "address":
      return utils.Conversion.toHexString(bytes, true);

    case "bytes":
      // debug("typeIdentifier %s %o", utils.typeIdentifier(definition), bytes);
      // HACK bytes may be getting passed in as a literal hexstring
      if (typeof bytes == "string") {
        return bytes;
      }
      let length = utils.Definition.specifiedSize(definition);
      return utils.Conversion.toHexString(bytes, length);

    case "string":
    case "stringliteral":
      // debug("typeIdentifier %s %o", utils.typeIdentifier(definition), bytes);
      if (typeof bytes == "string") {
        return bytes;
      }
      return String.fromCharCode.apply(undefined, bytes);

    case "rational":
      // debug("typeIdentifier %s %o", utils.typeIdentifier(definition), bytes);
      return utils.Conversion.toBN(bytes);

    default:
      // debug("Unknown value type: %s", utils.typeIdentifier(definition));
      return undefined;
  }
}