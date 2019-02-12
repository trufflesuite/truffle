import debugModule from "debug";
const debug = debugModule("decoder:decode:memory");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import { MemoryPointer, DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import range from "lodash.range";

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
  let length;

  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "bytes":
    case "string":
      length = DecodeUtils.Conversion.toBN(await read({
        memory: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE}
      }, state)).toNumber(); //initial word contains length

      let childPointer: MemoryPointer = {
        memory: { start: startPosition + DecodeUtils.EVM.WORD_SIZE, length }
      }

      return await decodeValue(definition, childPointer, info);

    case "array":

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

      let baseDefinition = definition.baseType || definition.typeName.baseType;

      // replace erroneous `_storage_` type identifiers with `_memory_`
      baseDefinition = DecodeUtils.Definition.spliceLocation(baseDefinition, "memory");

      return await Promise.all(range(length).map( (index: number) =>
        decodeMemory(baseDefinition,
          { memory: {
            start: startPosition + index * DecodeUtils.EVM.WORD_SIZE,
            length: DecodeUtils.EVM.WORD_SIZE
          }},
        info)
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

      // replace erroneous `_storage_` type identifiers with `_memory_`
      memberDefinition = DecodeUtils.Definition.spliceLocation(memberDefinition, "memory");

        let decoded;
        try {
          decoded = await decodeMemory(
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
