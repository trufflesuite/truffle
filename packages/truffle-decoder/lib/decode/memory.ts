import read from "../read";
import * as DecodeUtils from "@seesemichaelj/truffle-decode-utils";
import decodeValue from "./value";
import decode from "./index";
import { chunk } from "../read/memory";
import { MemoryPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";

export default async function decodeMemoryReference(definition: DecodeUtils.AstDefinition, pointer: MemoryPointer, info: EvmInfo): Promise<any> {
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
      }, state); // bytes contain length

      let childPointer: MemoryPointer = {
        memory: { start: rawValueNumber + DecodeUtils.EVM.WORD_SIZE, length: bytes.length }
      }

      return decodeValue(definition, childPointer, info);

    case "array":
      bytes = DecodeUtils.Conversion.toBN(await read({
        memory: { start: rawValueNumber, length: DecodeUtils.EVM.WORD_SIZE },
      }, state)).toNumber();  // bytes contain array length

      bytes = await read({ memory: {
        start: rawValueNumber + DecodeUtils.EVM.WORD_SIZE, length: bytes * DecodeUtils.EVM.WORD_SIZE
      }}, state); // now bytes contain items

      return chunk(bytes, DecodeUtils.EVM.WORD_SIZE)
        .map(
          (chunk) => decode(DecodeUtils.Definition.baseDefinition(definition), {
            literal: chunk
          }, info)
        )

    case "struct":
      const { scopes } = info;

      // Declaration reference usually appears in `typeName`, but for
      // { nodeType: "FunctionCall", kind: "structConstructorCall" }, this
      // reference appears to live in `expression`
      const referencedDeclaration = (definition.typeName)
        ? definition.typeName.referencedDeclaration
        : definition.expression.referencedDeclaration;

      let variables = (scopes[referencedDeclaration] || {}).variables;

      return Object.assign(
        {}, ...(variables || [])
          .map(
            ({name, id}: any, i: number) => {
              let memberDefinition = scopes[id].definition;
              let memberPointer: MemoryPointer = {
                memory: { start: rawValueNumber + i * DecodeUtils.EVM.WORD_SIZE, length: DecodeUtils.EVM.WORD_SIZE }
              };
              // let memberPointer = memory.read(state.memory, pointer + i * DecodeUtils.EVM.WORD_SIZE);

              // HACK
              memberDefinition = {
                ...memberDefinition,

                typeDescriptions: {
                  ...memberDefinition.typeDescriptions,

                  typeIdentifier:
                    memberDefinition.typeDescriptions.typeIdentifier
                      .replace(/_storage_/g, "_memory_")
                }
              };

              return {
                [name]: decode(
                  memberDefinition, memberPointer, info
                )
              };
            }
          )
      );


    default:
      // debug("Unknown memory reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;

  }

}