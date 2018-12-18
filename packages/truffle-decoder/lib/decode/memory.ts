import debugModule from "debug";
const debug = debugModule("decoder:decode:memory");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import decode from "./index";
import { chunk } from "../read/memory";
import { MemoryPointer, DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";

export default async function decodeMemoryReference(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo): Promise<any> {
  const { state } = info
  // debug("pointer %o", pointer);
  let rawValue: Uint8Array = await read(pointer, state);
  if (rawValue == undefined) {
    return undefined;
  }

  let rawValueNumber = DecodeUtils.Conversion.toBN(rawValue).toNumber();

  var bytes;
  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "bytes":
    case "string":
      bytes = await read({
        memory: { start: rawValueNumber, length: DecodeUtils.EVM.WORD_SIZE}
      }, state); // bytes contain length in the last byte

      let childPointer: MemoryPointer = {
        memory: { start: rawValueNumber + DecodeUtils.EVM.WORD_SIZE, length: bytes[DecodeUtils.EVM.WORD_SIZE - 1] }
      }

      return await decodeValue(definition, childPointer, info);

    case "array":
      bytes = DecodeUtils.Conversion.toBN(await read({
        memory: { start: rawValueNumber, length: DecodeUtils.EVM.WORD_SIZE },
      }, state)).toNumber();  // bytes contain array length

      bytes = await read({ memory: {
        start: rawValueNumber + DecodeUtils.EVM.WORD_SIZE, length: bytes * DecodeUtils.EVM.WORD_SIZE
      }}, state); // now bytes contain items

      let baseDefinition = DecodeUtils.Definition.baseDefinition(definition);

      // HACK replace erroneous `_storage_` type identifiers with `_memory_`
      baseDefinition = {
        ...baseDefinition,

        typeDescriptions: {
          ...baseDefinition.typeDescriptions,

          typeIdentifier:
            baseDefinition.typeDescriptions.typeIdentifier
              .replace(/_storage_/g, "_memory_")
        }
      };

      return await Promise.all(chunk(bytes, DecodeUtils.EVM.WORD_SIZE)
        .map(
          (chunk) => decode(baseDefinition, {
            literal: chunk
          }, info)
        ));

    case "struct":
      const { scopes } = info;

      // Declaration reference usually appears in `typeName`, but for
      // { nodeType: "FunctionCall", kind: "structConstructorCall" }, this
      // reference appears to live in `expression`
      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.expression.referencedDeclaration;

      let variables = (scopes[referencedDeclaration] || {}).variables;

      const decodeMember = async ({name, id}: any, i: number) => {
        let memberDefinition = scopes[id].definition;
        let memberPointer: MemoryPointer = {
          memory: {
            start: rawValueNumber + i * DecodeUtils.EVM.WORD_SIZE,
            length: DecodeUtils.EVM.WORD_SIZE
          }
        };

        // HACK replace erroneous `_storage_` type identifiers with `_memory_`
        memberDefinition = {
          ...memberDefinition,

          typeDescriptions: {
            ...memberDefinition.typeDescriptions,

            typeIdentifier:
              memberDefinition.typeDescriptions.typeIdentifier
                .replace(/_storage_/g, "_memory_")
          }
        };

        let decoded;
        try {
          decoded = await decode(
            memberDefinition, memberPointer, info
          );
        } catch (err) {
          decoded = err;
        }

        return {
          [name]: decoded
        };
      }

      const decodings = (variables || []).map(decodeMember);

      return Object.assign({}, ...await Promise.all(decodings));


    default:
      // debug("Unknown memory reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;

  }

}
