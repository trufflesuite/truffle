import debugModule from "debug";
const debug = debugModule("decoder:decode:value");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { EvmEnum } from "../interface/contract-decoder";
import Web3 from "web3";

export default async function decodeValue(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise<undefined | boolean | BN | string | EvmEnum> {
  const { state } = info;

  let bytes = await read(pointer, state, web3, contractAddress);
  if (bytes == undefined) {
    // debug("segfault, pointer %o, state: %O", pointer, state);
    return undefined;
  }

  debug("definition %O", definition);
  debug("pointer %o", pointer);

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "bool":
      return !DecodeUtils.Conversion.toBN(bytes).isZero();

    case "uint":
      return DecodeUtils.Conversion.toBN(bytes);

    case "int":
      return DecodeUtils.Conversion.toSignedBN(bytes);

    case "contract": //contract will get separate decoding later
    case "address":
      return DecodeUtils.Conversion.toAddress(bytes);

    case "bytes":
      // debug("typeIdentifier %s %o", DecodeUtils.typeIdentifier(definition), bytes);
      //if there's a static size, we want to truncate to that length
      let length = DecodeUtils.Definition.specifiedSize(definition);
      if(length !== null) {
        bytes = bytes.slice(0, length);
      }
      //we don't need to pass in length here, since that's for *adding* padding
      return DecodeUtils.Conversion.toHexString(bytes);

    case "string":
      // debug("typeIdentifier %s %o", DecodeUtils.typeIdentifier(definition), bytes);
      if (typeof bytes == "string") {
        return bytes;
      }
      return String.fromCharCode.apply(undefined, bytes);

    case "enum":
      const numRepresentation = DecodeUtils.Conversion.toBN(bytes).toNumber();
      debug("numRepresentation %d", numRepresentation);
      const referenceId = definition.referencedDeclaration || (definition.typeName ? definition.typeName.referencedDeclaration : undefined);
      const enumDeclaration = info.referenceDeclarations[referenceId];
      const decodedValue = enumDeclaration.members[numRepresentation].name;

      return <EvmEnum>{
        type: enumDeclaration.name,
        value: enumDeclaration.name + "." + decodedValue
      }

    default:
      // debug("Unknown value type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;
  }
}
