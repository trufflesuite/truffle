import debugModule from "debug";
const debug = debugModule("decoder:decode:memory");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import decode from "./index";
import { chunk } from "../read/memory";
import { MemoryPointer, DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";

export default async function decodeMemory(definition: DecodeUtils.AstDefinition, pointer: MemoryPointer, info: EvmInfo): Promise <any> {
  if(DecodeUtils.Definition.isReference(definition)) {
    return await decodeMemoryReference(definition, pointer, info);
  }
  else {
    return await decodeValue(definition, pointer, info);
  }
}

export async function decodeMemoryReference(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo): Promise<any> {
  const { state } = info
  // debug("pointer %o", pointer);
  let rawValue: Uint8Array = await read(pointer, state);

  let startPosition = DecodeUtils.Conversion.toBN(rawValue).toNumber();

  var bytes;
  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "bytes":
    case "string":
      bytes = await read({
        memory: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE}
      }, state); // bytes contain length in the last byte

      let childPointer: MemoryPointer = {
        memory: { start: startPosition + DecodeUtils.EVM.WORD_SIZE, length: bytes[DecodeUtils.EVM.WORD_SIZE - 1] }
      }

      return await decodeValue(definition, childPointer, info);

    case "array":
      let length;

      if (DecodeUtils.Definition.isDynamicArray(definition)) {
        length = DecodeUtils.Conversion.toBN(await read({
          memory: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE },
          }, state)).toNumber();  // initial word contains array length
        startPosition += DecodeUtils.EVM.WORD_SIZE; //increment startPosition to
        //next word, as first word was used for length
      }
      else {
        length = DecodeUtils.Definition.staticLength(definition);
      }

      bytes = await read({ memory: {
        start: startPosition, length: length * DecodeUtils.EVM.WORD_SIZE
      }}, state); // now bytes contain items

      let baseDefinition = definition.baseType || definition.typeName.baseType;

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
      const { referenceDeclarations } = info;

      // Declaration reference usually appears in `typeName`, but for
      // { nodeType: "FunctionCall", kind: "structConstructorCall" }, this
      // reference appears to live in `expression`
      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.expression.referencedDeclaration;

      let allMembers = referenceDeclarations[referencedDeclaration].members;
      let members = allMembers.filter( (memberDefinition) =>
        !DecodeUtils.Definition.isMapping(memberDefinition));

      debug("members %O", members);

      const decodeMember = async (memberDefinition: DecodeUtils.AstDefinition, i: number) => {
        let memberPointer: MemoryPointer = {
          memory: {
            start: startPosition + i * DecodeUtils.EVM.WORD_SIZE,
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
          [memberDefinition.name]: decoded
        };
      }

      const decodings = members.map(decodeMember);

      return Object.assign({}, ...await Promise.all(decodings));


    default:
      // debug("Unknown memory reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;

  }

}
