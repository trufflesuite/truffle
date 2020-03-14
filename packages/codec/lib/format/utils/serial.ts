import debugModule from "debug";
const debug = debugModule("codec:format:utils:serial");

import BN from "bn.js";
import Big from "big.js";

import * as Format from "@truffle/codec/format/common";
import * as Storage from "@truffle/codec/format/storage";
import { SerialFormatConfig } from "@truffle/codec/format/config";
import { tie, sever } from "./circularity";

//SERIALIZATION

export function serializeResult(
  value: Format.Values.Result
): Format.Values.Result<SerialFormatConfig> {
  return serializeUntiedResult(sever(value));
}

export function serializeType(
  dataType: Format.Types.Type
): Format.Types.Type<SerialFormatConfig> {
  switch (dataType.typeClass) {
    case "array":
      switch (dataType.kind) {
        case "static":
          return {
            typeClass: "array",
            kind: "static",
            baseType: serializeType(dataType.baseType),
            location: dataType.location,
            typeHint: dataType.typeHint,
            lengthAsString: dataType.length.toString()
          };
        case "dynamic":
          return {
            ...dataType,
            baseType: serializeType(dataType.baseType)
          };
      }
      break; //for TS
    case "struct":
      if (dataType.memberTypes !== undefined) {
        return {
          ...dataType,
          memberTypes: dataType.memberTypes.map(
            ({ name, type: memberType }) => ({
              name,
              type: serializeType(memberType)
            })
          )
        };
      } else {
        return <Format.Types.StructType<SerialFormatConfig>>(<unknown>dataType); //ugh Typescript
      }
    case "tuple":
      return {
        ...dataType,
        memberTypes: dataType.memberTypes.map(({ name, type: memberType }) => ({
          name,
          type: serializeType(memberType)
        }))
      };
    case "mapping":
      return {
        ...dataType,
        valueType: serializeType(dataType.valueType),
        keyType: <Format.Types.ElementaryType<SerialFormatConfig>>(
          serializeType(dataType.keyType)
        )
      };
    case "function":
      switch (dataType.visibility) {
        case "internal":
          return {
            ...dataType,
            inputParameterTypes: dataType.inputParameterTypes.map(
              serializeType
            ),
            outputParameterTypes: dataType.outputParameterTypes.map(
              serializeType
            )
          };
        case "external":
          switch (dataType.kind) {
            case "specific":
              return {
                ...dataType,
                inputParameterTypes: dataType.inputParameterTypes.map(
                  serializeType
                ),
                outputParameterTypes: dataType.outputParameterTypes.map(
                  serializeType
                )
              };
            case "general":
              return dataType;
          }
          break; //for TS
      }
      break; //for TS
    case "magic":
      if (dataType.memberTypes !== undefined) {
        return {
          ...dataType,
          memberTypes: Object.assign(
            {},
            ...Object.entries(dataType.memberTypes).map(
              ([name, memberType]) => ({
                [name]: serializeType(memberType)
              })
            )
          )
        };
      } else {
        return <Format.Types.MagicType<SerialFormatConfig>>(<unknown>dataType); //ugh
      }
    case "type":
      switch (dataType.type.typeClass) {
        case "contract":
          let coercedType = <Format.Types.TypeTypeContract>dataType;
          if (coercedType.stateVariableTypes !== undefined) {
            return {
              ...coercedType,
              stateVariableTypes: coercedType.stateVariableTypes.map(
                ({ name, type: stateVariableType }) => ({
                  name,
                  type: serializeType(stateVariableType)
                })
              )
            };
          } else {
            return <Format.Types.TypeTypeContract<SerialFormatConfig>>(
              (<unknown>coercedType)
            ); //fricking TypeScript
          }
        case "enum":
          return <Format.Types.TypeTypeEnum<SerialFormatConfig>>dataType;
      }
    default:
      return dataType;
  }
}

function serializeUntiedResult(
  value: Format.Values.Result
): Format.Values.Result<SerialFormatConfig> {
  let serializedType = serializeType(value.type);
  switch (value.kind) {
    case "value":
      switch (value.type.typeClass) {
        case "uint":
        case "int": {
          let coercedValue = <Format.Values.UintValue | Format.Values.IntValue>(
            value
          );
          if (coercedValue.value.rawAsBN) {
            return <
              | Format.Values.UintValue<SerialFormatConfig>
              | Format.Values.IntValue<SerialFormatConfig>
            >{
              ...coercedValue,
              type: serializedType,
              value: {
                asString: coercedValue.value.asBN.toString(),
                rawAsString: coercedValue.value.rawAsBN.toString()
              }
            };
          } else {
            return <
              | Format.Values.UintValue<SerialFormatConfig>
              | Format.Values.IntValue<SerialFormatConfig>
            >{
              ...coercedValue,
              type: serializedType,
              value: {
                asString: coercedValue.value.asBN.toString()
              }
            };
          }
        }
        case "fixed":
        case "ufixed": {
          let coercedValue = <
            Format.Values.FixedValue | Format.Values.UfixedValue
          >value;
          if (coercedValue.value.rawAsBig) {
            return <
              | Format.Values.FixedValue<SerialFormatConfig>
              | Format.Values.UfixedValue<SerialFormatConfig>
            >{
              ...coercedValue,
              type: serializedType,
              value: {
                asString: coercedValue.value.asBig.toFixed(),
                rawAsString: coercedValue.value.rawAsBig.toFixed()
              }
            };
          } else {
            return <
              | Format.Values.FixedValue<SerialFormatConfig>
              | Format.Values.UfixedValue<SerialFormatConfig>
            >{
              ...coercedValue,
              type: serializedType,
              value: {
                asString: coercedValue.value.asBig.toFixed()
              }
            };
          }
        }
        case "enum": {
          let coercedValue = <Format.Values.EnumValue>value;
          return {
            ...coercedValue,
            type: <Format.Types.EnumType<SerialFormatConfig>>serializedType,
            value: {
              name: coercedValue.value.name,
              numericAsString: coercedValue.value.numericAsBN.toString()
            }
          };
        }
        case "array": {
          let coercedValue = <Format.Values.ArrayValue>value;
          return {
            ...coercedValue,
            type: <Format.Types.ArrayType<SerialFormatConfig>>serializedType,
            value: coercedValue.value.map(serializeUntiedResult)
          };
        }
        case "mapping": {
          let coercedValue = <Format.Values.MappingValue>value;
          return {
            ...coercedValue,
            type: <Format.Types.MappingType<SerialFormatConfig>>serializedType,
            value: coercedValue.value.map(({ key, value }) => ({
              key: <Format.Values.ElementaryValue<SerialFormatConfig>>(
                serializeUntiedResult(key)
              ),
              value: serializeUntiedResult(value)
            }))
          };
        }
        case "struct": {
          let coercedValue = <Format.Values.StructValue>value;
          return {
            ...coercedValue,
            type: <Format.Types.StructType<SerialFormatConfig>>serializedType,
            value: coercedValue.value.map(({ name, value: element }) => ({
              name,
              value: serializeUntiedResult(element)
            }))
          };
        }
        case "tuple": {
          //had to split this from struct due to TS :-/
          let coercedValue = <Format.Values.TupleValue>value;
          return {
            ...coercedValue,
            type: <Format.Types.TupleType<SerialFormatConfig>>serializedType,
            value: coercedValue.value.map(({ name, value: element }) => ({
              name,
              value: serializeUntiedResult(element)
            }))
          };
        }
        case "magic": {
          let coercedValue = <Format.Values.MagicValue>value;
          return {
            ...coercedValue,
            type: <Format.Types.MagicType<SerialFormatConfig>>serializedType,
            value: Object.assign(
              {},
              ...Object.entries(coercedValue.value).map(([name, element]) => ({
                [name]: serializeUntiedResult(element)
              }))
            )
          };
        }
        case "type": {
          switch (value.type.type.typeClass) {
            case "contract": {
              let coercedValue = <Format.Values.TypeValueContract>value;
              return {
                ...coercedValue,
                type: <Format.Types.TypeTypeContract<SerialFormatConfig>>(
                  serializedType
                ),
                value: coercedValue.value.map(({ name, value: element }) => ({
                  name,
                  value: serializeUntiedResult(element)
                }))
              };
            }
            case "enum": {
              let coercedValue = <Format.Values.TypeValueEnum>value;
              return {
                ...coercedValue,
                type: <Format.Types.TypeTypeEnum<SerialFormatConfig>>(
                  serializedType
                ),
                value: <Format.Values.EnumValue<SerialFormatConfig>[]>(
                  coercedValue.value.map(serializeUntiedResult)
                )
              };
            }
          }
        }
        case "contract": {
          let coercedValue = <Format.Values.ContractValue>value;
          return {
            ...coercedValue,
            type: <Format.Types.ContractType<SerialFormatConfig>>serializedType,
            value: serializeContractValueInfo(coercedValue.value)
          };
        }
        case "function":
          switch (value.type.visibility) {
            case "external": {
              let coercedValue = <Format.Values.FunctionExternalValue>value;
              return <Format.Values.FunctionExternalValue<SerialFormatConfig>>{
                ...coercedValue,
                type: serializedType,
                value: {
                  ...coercedValue.value,
                  contract: serializeContractValueInfo(
                    coercedValue.value.contract
                  )
                }
              };
            }
            case "internal": {
              let coercedValue = <Format.Values.FunctionInternalValue>value;
              if (coercedValue.value.kind === "function") {
                return {
                  ...coercedValue,
                  type: <Format.Types.FunctionInternalType<SerialFormatConfig>>(
                    serializedType
                  ),
                  value: {
                    ...coercedValue.value,
                    context: <Format.Types.ContractType<SerialFormatConfig>>(
                      serializeType(coercedValue.value.context)
                    ),
                    definedIn: <Format.Types.ContractType<SerialFormatConfig>>(
                      serializeType(coercedValue.value.definedIn)
                    )
                  }
                };
              } else {
                return {
                  ...coercedValue,
                  type: <Format.Types.FunctionInternalType<SerialFormatConfig>>(
                    serializedType
                  ),
                  value: {
                    ...coercedValue.value,
                    context: <Format.Types.ContractType<SerialFormatConfig>>(
                      serializeType(coercedValue.value.context)
                    )
                  }
                };
              }
            }
          }
        default:
          return <Format.Values.Value<SerialFormatConfig>>{
            ...value,
            type: serializedType
          };
      }
    case "error":
      switch (value.error.kind) {
        case "BoolOutOfRangeError":
          return {
            type: <Format.Types.BoolType<SerialFormatConfig>>serializedType,
            kind: "error",
            error: {
              kind: "BoolOutOfRangeError" as const,
              rawAsString: value.error.rawAsBN.toString()
            }
          };
        case "EnumOutOfRangeError":
        case "EnumNotFoundDecodingError":
          return <Format.Errors.EnumErrorResult<SerialFormatConfig>>{
            type: serializedType,
            kind: "error",
            error: {
              kind: value.error.kind,
              type: serializeType(value.error.type),
              rawAsString: value.error.rawAsBN.toString()
            }
          };
        case "NoSuchInternalFunctionError":
        case "DeployedFunctionInConstructorError":
        case "MalformedInternalFunctionError":
          return {
            type: <Format.Types.FunctionInternalType<SerialFormatConfig>>(
              serializedType
            ),
            kind: "error",
            error: {
              ...value.error,
              context: <Format.Types.ContractType<SerialFormatConfig>>(
                serializeType(value.error.context)
              )
            }
          };
        case "UserDefinedTypeNotFoundError":
          return <Format.Errors.ErrorResult<SerialFormatConfig>>{
            type: serializedType,
            kind: "error",
            error: {
              ...value.error,
              type: serializeType(value.error.type)
            }
          };
        case "ReadErrorStorage":
          return <Format.Errors.ErrorResult<SerialFormatConfig>>{
            type: serializedType,
            kind: "error",
            error: {
              ...value.error,
              range: serializeRange(value.error.range)
            }
          };
        case "OverlongArraysAndStringsNotImplementedError":
          return <Format.Errors.ErrorResult<SerialFormatConfig>>{
            type: serializedType,
            kind: "error",
            error:
              value.error.dataLength !== undefined
                ? {
                    kind: "OverlongArraysAndStringsNotImplementedError" as const,
                    dataLength: value.error.dataLength,
                    lengthAsString: value.error.lengthAsBN.toString()
                  }
                : {
                    kind: "OverlongArraysAndStringsNotImplementedError" as const,
                    lengthAsString: value.error.lengthAsBN.toString()
                  }
          };
        case "OverlargePointersNotImplementedError":
          return <Format.Errors.ErrorResult<SerialFormatConfig>>{
            type: serializedType,
            kind: "error",
            error: {
              kind: "OverlargePointersNotImplementedError" as const,
              pointerAsString: value.error.pointerAsBN.toString()
            }
          };
        default:
          return <Format.Errors.ErrorResult<SerialFormatConfig>>(
            (<unknown>value)
          ); //blech
      }
  }
}

function serializeContractValueInfo(
  info: Format.Values.ContractValueInfo
): Format.Values.ContractValueInfo<SerialFormatConfig> {
  switch (info.kind) {
    case "unknown":
      return info;
    case "known":
      return {
        ...info,
        class: <Format.Types.ContractType<SerialFormatConfig>>(
          serializeType(info.class)
        )
      };
  }
}

function serializeRange(
  range: Storage.Range
): Storage.Range<SerialFormatConfig> {
  return {
    ...range,
    from: {
      ...range.from,
      slot: serializeSlot(range.from.slot)
    },
    to: range.to
      ? {
          ...range.to,
          slot: serializeSlot(range.to.slot)
        }
      : undefined
  };
}

function serializeSlot(slot: Storage.Slot): Storage.Slot<SerialFormatConfig> {
  return {
    ...slot,
    path: slot.path ? serializeSlot(slot.path) : undefined,
    key: slot.key
      ? <Format.Values.ElementaryValue<SerialFormatConfig>>(
          serializeUntiedResult(slot.key)
        )
      : undefined,
    offsetAsString: slot.offset.toString()
  };
}

//DESERIALIZATION (apologies for copypaste)

export function deserializeResult(
  value: Format.Values.Result<SerialFormatConfig>
): Format.Values.Result {
  return tie(deserializeToUntiedResult(value));
}

export function deserializeType(
  dataType: Format.Types.Type<SerialFormatConfig>
): Format.Types.Type {
  switch (dataType.typeClass) {
    case "array":
      switch (dataType.kind) {
        case "static":
          return {
            typeClass: "array",
            kind: "static",
            baseType: deserializeType(dataType.baseType),
            location: dataType.location,
            typeHint: dataType.typeHint,
            length: new BN(dataType.lengthAsString)
          };
        case "dynamic":
          return {
            ...dataType,
            baseType: deserializeType(dataType.baseType)
          };
      }
      break; //for TS
    case "struct":
      if (dataType.memberTypes !== undefined) {
        return {
          ...dataType,
          memberTypes: dataType.memberTypes.map(
            ({ name, type: memberType }) => ({
              name,
              type: deserializeType(memberType)
            })
          )
        };
      } else {
        return <Format.Types.StructType>(<unknown>dataType); //ugh Typescript
      }
    case "tuple":
      return {
        ...dataType,
        memberTypes: dataType.memberTypes.map(({ name, type: memberType }) => ({
          name,
          type: deserializeType(memberType)
        }))
      };
    case "mapping":
      return {
        ...dataType,
        valueType: deserializeType(dataType.valueType),
        keyType: <Format.Types.ElementaryType>deserializeType(dataType.keyType)
      };
    case "function":
      switch (dataType.visibility) {
        case "internal":
          return {
            ...dataType,
            inputParameterTypes: dataType.inputParameterTypes.map(
              deserializeType
            ),
            outputParameterTypes: dataType.outputParameterTypes.map(
              deserializeType
            )
          };
        case "external":
          switch (dataType.kind) {
            case "specific":
              return {
                ...dataType,
                inputParameterTypes: dataType.inputParameterTypes.map(
                  deserializeType
                ),
                outputParameterTypes: dataType.outputParameterTypes.map(
                  deserializeType
                )
              };
            case "general":
              return dataType;
          }
          break; //for TS
      }
      break; //for TS
    case "magic":
      if (dataType.memberTypes !== undefined) {
        return {
          ...dataType,
          memberTypes: Object.assign(
            {},
            ...Object.entries(dataType.memberTypes).map(
              ([name, memberType]) => ({
                [name]: deserializeType(memberType)
              })
            )
          )
        };
      } else {
        return <Format.Types.MagicType>(<unknown>dataType); //ugh
      }
    case "type":
      switch (dataType.type.typeClass) {
        case "contract":
          let coercedType = <Format.Types.TypeTypeContract<SerialFormatConfig>>(
            dataType
          );
          if (coercedType.stateVariableTypes !== undefined) {
            return {
              ...coercedType,
              stateVariableTypes: coercedType.stateVariableTypes.map(
                ({ name, type: stateVariableType }) => ({
                  name,
                  type: deserializeType(stateVariableType)
                })
              )
            };
          } else {
            return <Format.Types.TypeTypeContract>(<unknown>coercedType); //fricking TypeScript
          }
        case "enum":
          return <Format.Types.TypeTypeEnum>dataType;
      }
    default:
      return dataType;
  }
}

function deserializeToUntiedResult(
  value: Format.Values.Result<SerialFormatConfig>
): Format.Values.Result {
  let deserializedType = deserializeType(value.type);
  switch (value.kind) {
    case "value":
      switch (value.type.typeClass) {
        case "uint":
        case "int": {
          let coercedValue = <
            | Format.Values.UintValue<SerialFormatConfig>
            | Format.Values.IntValue<SerialFormatConfig>
          >value;
          if (coercedValue.value.rawAsString !== undefined) {
            return <Format.Values.UintValue | Format.Values.IntValue>{
              ...coercedValue,
              type: deserializedType,
              value: {
                asBN: new BN(coercedValue.value.asString),
                rawAsBN: new BN(coercedValue.value.rawAsString)
              }
            };
          } else {
            return <Format.Values.UintValue | Format.Values.IntValue>{
              ...coercedValue,
              type: deserializedType,
              value: {
                asBN: new BN(coercedValue.value.asString)
              }
            };
          }
        }
        case "fixed":
        case "ufixed": {
          let coercedValue = <
            | Format.Values.FixedValue<SerialFormatConfig>
            | Format.Values.UfixedValue<SerialFormatConfig>
          >value;
          if (coercedValue.value.rawAsString !== undefined) {
            return <Format.Values.FixedValue | Format.Values.UfixedValue>{
              ...coercedValue,
              type: deserializedType,
              value: {
                asBig: new Big(coercedValue.value.asString),
                rawAsBig: new Big(coercedValue.value.rawAsString)
              }
            };
          } else {
            return <Format.Values.FixedValue | Format.Values.UfixedValue>{
              ...coercedValue,
              type: deserializedType,
              value: {
                asBig: new Big(coercedValue.value.asString)
              }
            };
          }
        }
        case "enum": {
          let coercedValue = <Format.Values.EnumValue<SerialFormatConfig>>value;
          return {
            ...coercedValue,
            type: <Format.Types.EnumType>deserializedType,
            value: {
              name: coercedValue.value.name,
              numericAsBN: new BN(coercedValue.value.numericAsString)
            }
          };
        }
        case "array": {
          let coercedValue = <Format.Values.ArrayValue<SerialFormatConfig>>(
            value
          );
          return {
            ...coercedValue,
            type: <Format.Types.ArrayType>deserializedType,
            value: coercedValue.value.map(deserializeToUntiedResult)
          };
        }
        case "mapping": {
          let coercedValue = <Format.Values.MappingValue<SerialFormatConfig>>(
            value
          );
          return {
            ...coercedValue,
            type: <Format.Types.MappingType>deserializedType,
            value: coercedValue.value.map(({ key, value }) => ({
              key: <Format.Values.ElementaryValue>(
                deserializeToUntiedResult(key)
              ),
              value: deserializeToUntiedResult(value)
            }))
          };
        }
        case "struct": {
          let coercedValue = <Format.Values.StructValue<SerialFormatConfig>>(
            value
          );
          return {
            ...coercedValue,
            type: <Format.Types.StructType>deserializedType,
            value: coercedValue.value.map(({ name, value: element }) => ({
              name,
              value: deserializeToUntiedResult(element)
            }))
          };
        }
        case "tuple": {
          //had to split this from struct due to TS :-/
          let coercedValue = <Format.Values.TupleValue<SerialFormatConfig>>(
            value
          );
          return {
            ...coercedValue,
            type: <Format.Types.TupleType>deserializedType,
            value: coercedValue.value.map(({ name, value: element }) => ({
              name,
              value: deserializeToUntiedResult(element)
            }))
          };
        }
        case "magic": {
          let coercedValue = <Format.Values.MagicValue<SerialFormatConfig>>(
            value
          );
          return {
            ...coercedValue,
            type: <Format.Types.MagicType>deserializedType,
            value: Object.assign(
              {},
              ...Object.entries(coercedValue.value).map(([name, element]) => ({
                [name]: deserializeToUntiedResult(element)
              }))
            )
          };
        }
        case "type": {
          switch (value.type.type.typeClass) {
            case "contract": {
              let coercedValue = <
                Format.Values.TypeValueContract<SerialFormatConfig>
              >value;
              return {
                ...coercedValue,
                type: <Format.Types.TypeTypeContract>deserializedType,
                value: coercedValue.value.map(({ name, value: element }) => ({
                  name,
                  value: deserializeToUntiedResult(element)
                }))
              };
            }
            case "enum": {
              let coercedValue = <
                Format.Values.TypeValueEnum<SerialFormatConfig>
              >value;
              return {
                ...coercedValue,
                type: <Format.Types.TypeTypeEnum>deserializedType,
                value: <Format.Values.EnumValue[]>(
                  coercedValue.value.map(deserializeToUntiedResult)
                )
              };
            }
          }
        }
        case "contract": {
          let coercedValue = <Format.Values.ContractValue<SerialFormatConfig>>(
            value
          );
          return {
            ...coercedValue,
            type: <Format.Types.ContractType>deserializedType,
            value: deserializeContractValueInfo(coercedValue.value)
          };
        }
        case "function":
          switch (value.type.visibility) {
            case "external": {
              let coercedValue = <
                Format.Values.FunctionExternalValue<SerialFormatConfig>
              >value;
              return <Format.Values.FunctionExternalValue>{
                ...coercedValue,
                type: deserializedType,
                value: {
                  ...coercedValue.value,
                  contract: deserializeContractValueInfo(
                    coercedValue.value.contract
                  )
                }
              };
            }
            case "internal": {
              let coercedValue = <
                Format.Values.FunctionInternalValue<SerialFormatConfig>
              >value;
              if (coercedValue.value.kind === "function") {
                return {
                  ...coercedValue,
                  type: <Format.Types.FunctionInternalType>deserializedType,
                  value: {
                    ...coercedValue.value,
                    context: <Format.Types.ContractType>(
                      deserializeType(coercedValue.value.context)
                    ),
                    definedIn: <Format.Types.ContractType>(
                      deserializeType(coercedValue.value.definedIn)
                    )
                  }
                };
              } else {
                return {
                  ...coercedValue,
                  type: <Format.Types.FunctionInternalType>deserializedType,
                  value: {
                    ...coercedValue.value,
                    context: <Format.Types.ContractType>(
                      deserializeType(coercedValue.value.context)
                    )
                  }
                };
              }
            }
          }
        default:
          return <Format.Values.Value>{
            ...value,
            type: deserializedType
          };
      }
    case "error":
      switch (value.error.kind) {
        case "BoolOutOfRangeError":
          return {
            type: <Format.Types.BoolType>deserializedType,
            kind: "error",
            error: {
              kind: "BoolOutOfRangeError" as const,
              rawAsBN: new BN(value.error.rawAsString)
            }
          };
        case "EnumOutOfRangeError":
        case "EnumNotFoundDecodingError":
          return <Format.Errors.EnumErrorResult>{
            type: deserializedType,
            kind: "error",
            error: {
              kind: value.error.kind,
              type: deserializeType(value.error.type),
              rawAsBN: new BN(value.error.rawAsString)
            }
          };
        case "NoSuchInternalFunctionError":
        case "DeployedFunctionInConstructorError":
        case "MalformedInternalFunctionError":
          return {
            type: <Format.Types.FunctionInternalType>deserializedType,
            kind: "error",
            error: {
              ...value.error,
              context: <Format.Types.ContractType>(
                deserializeType(value.error.context)
              )
            }
          };
        case "UserDefinedTypeNotFoundError":
          return <Format.Errors.ErrorResult>{
            type: deserializedType,
            kind: "error",
            error: {
              ...value.error,
              type: deserializeType(value.error.type)
            }
          };
        case "ReadErrorStorage":
          return <Format.Errors.ErrorResult>{
            type: deserializedType,
            kind: "error",
            error: {
              ...value.error,
              range: deserializeRange(value.error.range)
            }
          };
        case "OverlongArraysAndStringsNotImplementedError":
          return <Format.Errors.ErrorResult>{
            type: deserializedType,
            kind: "error",
            error:
              value.error.dataLength !== undefined
                ? {
                    kind: "OverlongArraysAndStringsNotImplementedError" as const,
                    dataLength: value.error.dataLength,
                    lengthAsBN: new BN(value.error.lengthAsString)
                  }
                : {
                    kind: "OverlongArraysAndStringsNotImplementedError" as const,
                    lengthAsBN: new BN(value.error.lengthAsString)
                  }
          };
        case "OverlargePointersNotImplementedError":
          return <Format.Errors.ErrorResult>{
            type: deserializedType,
            kind: "error",
            error: {
              kind: "OverlargePointersNotImplementedError" as const,
              pointerAsBN: new BN(value.error.pointerAsString)
            }
          };
        default:
          return <Format.Errors.ErrorResult>(<unknown>value); //blech
      }
  }
}

function deserializeContractValueInfo(
  info: Format.Values.ContractValueInfo<SerialFormatConfig>
): Format.Values.ContractValueInfo {
  switch (info.kind) {
    case "unknown":
      return info;
    case "known":
      return {
        ...info,
        class: <Format.Types.ContractType>deserializeType(info.class)
      };
  }
}

function deserializeRange(
  range: Storage.Range<SerialFormatConfig>
): Storage.Range {
  return {
    ...range,
    from: {
      ...range.from,
      slot: deserializeSlot(range.from.slot)
    },
    to: range.to
      ? {
          ...range.to,
          slot: deserializeSlot(range.to.slot)
        }
      : undefined
  };
}

function deserializeSlot(slot: Storage.Slot<SerialFormatConfig>): Storage.Slot {
  return {
    ...slot,
    path: slot.path ? deserializeSlot(slot.path) : undefined,
    key: slot.key
      ? <Format.Values.ElementaryValue>deserializeToUntiedResult(slot.key)
      : undefined,
    offset: new BN(slot.offsetAsString)
  };
}
