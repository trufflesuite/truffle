import debugModule from "debug";
const debug = debugModule("decoder:decode:value");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { EvmEnum } from "../interface/contract-decoder";
import { DecoderRequest } from "../types/request";

export default function* decodeValue(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo): IterableIterator<undefined | boolean | BN | string | DecoderRequest | Uint8Array> {
  //NOTE: this does not actually return a Uint8Aarray, but due to the use of yield* read,
  //we have to include it in the type :-/
  const { state } = info;

  let bytes = yield* read(pointer, state);
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
