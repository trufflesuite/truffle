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

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "bool":
      return !DecodeUtils.Conversion.toBN(bytes).isZero();

    case "uint":
      return DecodeUtils.Conversion.toBN(bytes);

    case "int":
      return DecodeUtils.Conversion.toSignedBN(bytes);

    case "address":
      return DecodeUtils.Conversion.toHexString(bytes, true);

    case "bytes":
      // debug("typeIdentifier %s %o", DecodeUtils.typeIdentifier(definition), bytes);
      // HACK bytes may be getting passed in as a literal hexstring
      if (typeof bytes == "string") {
        return bytes;
      }
      let length = DecodeUtils.Definition.specifiedSize(definition);
      return DecodeUtils.Conversion.toHexString(bytes, length);

    case "string":
    case "stringliteral":
      // debug("typeIdentifier %s %o", DecodeUtils.typeIdentifier(definition), bytes);
      if (typeof bytes == "string") {
        return bytes;
      }
      return String.fromCharCode.apply(undefined, bytes);

    case "rational":
      // debug("typeIdentifier %s %o", DecodeUtils.typeIdentifier(definition), bytes);
      return DecodeUtils.Conversion.toBN(bytes);

    case "enum":
      const numRepresentation = DecodeUtils.Conversion.toBN(bytes).toNumber();
      const referenceId = definition.referencedDeclaration;
      const enumDeclaration = (info.referenceDeclarations)
        ? info.referenceDeclarations[referenceId]
        : info.scopes[referenceId].definition;
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
