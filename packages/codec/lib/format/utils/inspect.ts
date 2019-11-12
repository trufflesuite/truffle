import debugModule from "debug";
const debug = debugModule("codec:format:utils:inspect");

import util from "util";
import * as Format from "@truffle/codec/format/common";
import * as Exception from "./exception";

//we'll need to write a typing for the options type ourself, it seems; just
//going to include the relevant properties here
interface InspectOptions {
  stylize?: (toMaybeColor: string, style?: string) => string;
  colors: boolean;
  breakLength: number;
}

//HACK -- inspect options are ridiculous, I swear >_>
function cleanStylize(options: InspectOptions) {
  return Object.assign(
    {},
    ...Object.entries(options).map(
      ([key, value]) => (key === "stylize" ? {} : { [key]: value })
    )
  );
}

/**
 * This class is meant to be used with Node's
 * [util.inspect()](https://nodejs.org/api/util.html#util_util_inspect_object_options)
 * function.  Given a [[Format.Values.Result]] `value`, one can use
 * `new ResultInspector(value)` to create a ResultInspector for that value,
 * which can be used with util.inspect() to create a human-readable string
 * representing the value.
 *
 * @example
 * Suppose `value` is a Result.  In Node, the following would print to the
 * console a human-readable representation of `value`, with colors enabled,
 * no maximum depth, and no maximum array length, and lines (usually) no
 * longer than 80 characters:
 * ```javascript
 * console.log(
 *   util.inspect(
 *     new ResultInspector(value),
 *     {
 *       colors: true,
 *       depth: null,
 *       maxArrayLength: null,
 *       breakLength: 80
 *     }
 *   )
 * );
 * ```
 * Of course, there are many other ways to use util.inspect; see Node's
 * documentation, linked above, for more.
 */
export class ResultInspector {
  result: Format.Values.Result;
  constructor(result: Format.Values.Result) {
    this.result = result;
  }
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    switch (this.result.kind) {
      case "value":
        switch (this.result.type.typeClass) {
          case "uint":
          case "int":
            return options.stylize(
              (<Format.Values.UintValue | Format.Values.IntValue>(
                this.result
              )).value.asBN.toString(),
              "number"
            );
          case "fixed":
          case "ufixed":
            //note: because this is just for display, we don't bother adjusting the magic values Big.NE or Big.PE;
            //we'll trust those to their defaults
            return options.stylize(
              (<Format.Values.FixedValue | Format.Values.UfixedValue>(
                this.result
              )).value.asBig.toString(),
              "number"
            );
          case "bool":
            return util.inspect(
              (<Format.Values.BoolValue>this.result).value.asBoolean,
              options
            );
          case "bytes":
            let hex = (<Format.Values.BytesValue>this.result).value.asHex;
            switch (this.result.type.kind) {
              case "static":
                return options.stylize(hex, "number");
              case "dynamic":
                return options.stylize(`hex'${hex.slice(2)}'`, "string");
            }
          case "address":
            return options.stylize(
              (<Format.Values.AddressValue>this.result).value.asAddress,
              "number"
            );
          case "string": {
            let coercedResult = <Format.Values.StringValue>this.result;
            switch (coercedResult.value.kind) {
              case "valid":
                return util.inspect(coercedResult.value.asString, options);
              case "malformed":
                //note: this will turn malformed utf-8 into replacement characters (U+FFFD)
                //note we need to cut off the 0x prefix
                return util.inspect(
                  Buffer.from(
                    coercedResult.value.asHex.slice(2),
                    "hex"
                  ).toString()
                );
            }
          }
          case "array": {
            let coercedResult = <Format.Values.ArrayValue>this.result;
            if (coercedResult.reference !== undefined) {
              return formatCircular(coercedResult.reference, options);
            }
            return util.inspect(
              coercedResult.value.map(element => new ResultInspector(element)),
              options
            );
          }
          case "mapping":
            return util.inspect(
              new Map(
                (<Format.Values.MappingValue>this.result).value.map(
                  ({ key, value }) => [
                    new ResultInspector(key),
                    new ResultInspector(value)
                  ]
                )
              ),
              options
            );
          case "struct": {
            let coercedResult = <Format.Values.StructValue>this.result;
            if (coercedResult.reference !== undefined) {
              return formatCircular(coercedResult.reference, options);
            }
            return util.inspect(
              Object.assign(
                {},
                ...coercedResult.value.map(({ name, value }) => ({
                  [name]: new ResultInspector(value)
                }))
              ),
              options
            );
          }
          case "type": {
            //same as struct case but w/o circularity check
            let coercedResult = <Format.Values.TypeValue>this.result;
            return util.inspect(
              Object.assign(
                {},
                ...coercedResult.value.map(({ name, value }) => ({
                  [name]: new ResultInspector(value)
                }))
              ),
              options
            );
          }
          case "magic":
            return util.inspect(
              Object.assign(
                {},
                ...Object.entries(
                  (<Format.Values.MagicValue>this.result).value
                ).map(([key, value]) => ({ [key]: new ResultInspector(value) }))
              ),
              options
            );
          case "enum": {
            return enumFullName(<Format.Values.EnumValue>this.result); //not stylized
          }
          case "contract": {
            return util.inspect(
              new ContractInfoInspector(
                (<Format.Values.ContractValue>this.result).value
              ),
              options
            );
          }
          case "function":
            switch (this.result.type.visibility) {
              case "external": {
                let coercedResult = <Format.Values.FunctionExternalValue>(
                  this.result
                );
                let contractString = util.inspect(
                  new ContractInfoInspector(coercedResult.value.contract),
                  { ...cleanStylize(options), colors: false }
                );
                let firstLine: string;
                switch (coercedResult.value.kind) {
                  case "known":
                    firstLine = `[Function: ${coercedResult.value.abi.name} of`;
                    break;
                  case "invalid":
                  case "unknown":
                    firstLine = `[Function: Unknown selector ${
                      coercedResult.value.selector
                    } of`;
                    break;
                }
                let secondLine = `${contractString}]`;
                let breakingSpace =
                  firstLine.length >= options.breakLength ? "\n" : " ";
                //now, put it together
                return options.stylize(
                  firstLine + breakingSpace + secondLine,
                  "special"
                );
              }
              case "internal": {
                let coercedResult = <Format.Values.FunctionInternalValue>(
                  this.result
                );
                switch (coercedResult.value.kind) {
                  case "function":
                    return options.stylize(
                      `[Function: ${coercedResult.value.definedIn.typeName}.${
                        coercedResult.value.name
                      }]`,
                      "special"
                    );
                  case "exception":
                    return coercedResult.value.deployedProgramCounter === 0
                      ? options.stylize(`[Function: <zero>]`, "special")
                      : options.stylize(`[Function: assert(false)]`, "special");
                  case "unknown":
                    let firstLine = `[Function: decoding not supported (raw info:`;
                    let secondLine = `deployed PC=${
                      coercedResult.value.deployedProgramCounter
                    }, constructor PC=${
                      coercedResult.value.constructorProgramCounter
                    })]`;
                    let breakingSpace =
                      firstLine.length >= options.breakLength ? "\n" : " ";
                    //now, put it together
                    return options.stylize(
                      firstLine + breakingSpace + secondLine,
                      "special"
                    );
                }
              }
            }
        }
      case "error": {
        debug("this.result: %O", this.result);
        let errorResult = <Format.Errors.ErrorResult>this.result; //the hell?? why couldn't it make this inference??
        switch (errorResult.error.kind) {
          case "UintPaddingError":
            return `Uint has extra leading bytes (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "IntPaddingError":
            return `Int out of range (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "UintPaddingError":
            return `Ufixed has extra leading bytes (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "FixedPaddingError":
            return `Fixed out of range (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "BoolOutOfRangeError":
            return `Invalid boolean (numeric value ${errorResult.error.rawAsBN.toString()})`;
          case "BytesPaddingError":
            return `Bytestring has extra trailing bytes (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "AddressPaddingError":
            return `Address has extra leading bytes (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "EnumOutOfRangeError":
            return `Invalid ${enumTypeName(
              errorResult.error.type
            )} (numeric value ${errorResult.error.rawAsBN.toString()})`;
          case "EnumNotFoundDecodingError":
            return `Unknown enum type ${enumTypeName(
              errorResult.error.type
            )} of id ${
              errorResult.error.type.id
            } (numeric value ${errorResult.error.rawAsBN.toString()})`;
          case "ContractPaddingError":
            return `Contract address has extra leading bytes (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "FunctionExternalNonStackPaddingError":
            return `External function has extra trailing bytes (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "FunctionExternalStackPaddingError":
            return `External function address or selector has extra leading bytes (padding error) (raw address ${
              errorResult.error.rawAddress
            }, raw selector ${errorResult.error.rawSelector})`;
          case "FunctionInternalPaddingError":
            return `Internal function has extra leading bytes (padding error) (raw value ${
              errorResult.error.raw
            })`;
          case "NoSuchInternalFunctionError":
            return `Invalid function (Deployed PC=${
              errorResult.error.deployedProgramCounter
            }, constructor PC=${
              errorResult.error.constructorProgramCounter
            }) of contract ${errorResult.error.context.typeName}`;
          case "DeployedFunctionInConstructorError":
            return `Deployed-style function (PC=${
              errorResult.error.deployedProgramCounter
            }) in constructor`;
          case "MalformedInternalFunctionError":
            return `Malformed internal function w/constructor PC only (value: ${
              errorResult.error.constructorProgramCounter
            })`;
          case "IndexedReferenceTypeError":
            return `Cannot decode indexed parameter of reference type ${
              errorResult.error.type.typeClass
            } (raw value ${errorResult.error.raw})`;
          case "OverlongArraysAndStringsNotImplementedError":
            return `Array or string is too long (length ${errorResult.error.lengthAsBN.toString()}); decoding is not supported`;
          case "OverlargePointersNotImplementedError":
            return `Pointer is too large (value ${errorResult.error.pointerAsBN.toString()}); decoding is not supported`;
          case "UserDefinedTypeNotFoundError":
          case "UnsupportedConstantError":
          case "ReadErrorStack":
          case "ReadErrorStorage":
          case "ReadErrorBytes":
            return Exception.message(errorResult.error); //yay, these five are already defined!
        }
      }
    }
  }
}

//these get their own class to deal with a minor complication
class ContractInfoInspector {
  value: Format.Values.ContractValueInfo;
  constructor(value: Format.Values.ContractValueInfo) {
    this.value = value;
  }
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    switch (this.value.kind) {
      case "known":
        return (
          options.stylize(this.value.address, "number") +
          ` (${this.value.class.typeName})`
        );
      case "unknown":
        return (
          options.stylize(this.value.address, "number") + " of unknown class"
        );
    }
  }
}

function enumTypeName(enumType: Format.Types.EnumType) {
  return (
    (enumType.kind === "local" ? enumType.definingContractName + "." : "") +
    enumType.typeName
  );
}

function styleHexString(hex: string, options: InspectOptions): string {
  return options.stylize(`hex'${hex.slice(2)}'`, "string");
}

//this function will be used in the future for displaying circular
//structures
function formatCircular(loopLength: number, options: InspectOptions): string {
  return options.stylize(`[Circular (=up ${this.loopLength})]`, "special");
}

function enumFullName(value: Format.Values.EnumValue): string {
  switch (value.type.kind) {
    case "local":
      return `${value.type.definingContractName}.${value.type.typeName}.${
        value.value.name
      }`;
    case "global":
      return `${value.type.typeName}.${value.value.name}`;
  }
}

/**
 * WARNING! Do NOT use this function in real code unless you
 * absolutely have to!  Using it in controlled tests is fine,
 * but do NOT use it in real code if you have any better option!
 * See [[nativize]] for why!
 */
export function nativizeVariables(variables: {
  [name: string]: Format.Values.Result;
}): { [name: string]: any } {
  return Object.assign(
    {},
    ...Object.entries(variables).map(([name, value]) => ({
      [name]: nativize(value)
    }))
  );
}

//HACK! Avoid using!
/**
 * WARNING! Do NOT use this function in real code unless you absolutely have
 * to!  Using it in controlled tests is fine, but do NOT use it in real code if
 * you have any better option!
 *
 * This function is a giant hack.  It will throw exceptions on numbers that
 * don't fit in a Javascript number.  It will go into an infinite loop on
 * circular structures (although that might be fixed eventually).  It was only
 * ever written to support our hacked-together watch expression system, and
 * later repurposed to make testing easier.
 *
 * If you are not doing something as horrible as evaluating user-inputted
 * Javascript expressions meant to operate upon Solidity variables, then you
 * probably have a better option than using this in real code!
 *
 * (For instance, if you just want to nicely print individual values, without
 * attempting to first operate on them via Javascript expressions, we have the
 * [[ResultInspector]] class, which can be used with Node's
 * [util.inspect()](https://nodejs.org/api/util.html#util_util_inspect_object_options)
 * to do exactly that.)
 *
 * Remember, the decoder output format was made to be machine-readable.  It
 * shouldn't be too hard for you to process.  If it comes to it, copy-paste
 * this code and dehackify it for your use case, which hopefully is more
 * manageable than the one that caused us to write this.
 */
export function nativize(result: Format.Values.Result): any {
  if (result.kind === "error") {
    return undefined;
  }
  switch (result.type.typeClass) {
    case "uint":
    case "int":
      return (<Format.Values.UintValue | Format.Values.IntValue>(
        result
      )).value.asBN.toNumber(); //WARNING
    case "bool":
      return (<Format.Values.BoolValue>result).value.asBoolean;
    case "bytes":
      return (<Format.Values.BytesValue>result).value.asHex;
    case "address":
      return (<Format.Values.AddressValue>result).value.asAddress;
    case "string": {
      let coercedResult = <Format.Values.StringValue>result;
      switch (coercedResult.value.kind) {
        case "valid":
          return coercedResult.value.asString;
        case "malformed":
          // this will turn malformed utf-8 into replacement characters (U+FFFD) (WARNING)
          // note we need to cut off the 0x prefix
          return Buffer.from(
            coercedResult.value.asHex.slice(2),
            "hex"
          ).toString();
      }
    }
    case "fixed":
    case "ufixed":
      //HACK: Big doesn't have a toNumber() method, so we convert to string and then parse with Number
      //NOTE: we don't bother setting the magic variables Big.NE or Big.PE first, as the choice of
      //notation shouldn't affect the result (can you believe I have to write this? @_@)
      return Number(
        (<Format.Values.FixedValue | Format.Values.UfixedValue>(
          result
        )).value.asBig.toString()
      ); //WARNING
    case "array": //WARNING: circular case not handled; will loop infinitely
      return (<Format.Values.ArrayValue>result).value.map(nativize);
    case "mapping":
      return Object.assign(
        {},
        ...(<Format.Values.MappingValue>result).value.map(({ key, value }) => ({
          [nativize(key).toString()]: nativize(value)
        }))
      );
    case "struct": //WARNING: circular case not handled; will loop infinitely
      return Object.assign(
        {},
        ...(<Format.Values.StructValue>result).value.map(({ name, value }) => ({
          [name]: nativize(value)
        }))
      );
    case "type": //keeping this separate from struct as struct will likely get
      //some modifications later
      return Object.assign(
        {},
        ...(<Format.Values.TypeValue>result).value.map(({ name, value }) => ({
          [name]: nativize(value)
        }))
      );
    case "tuple":
      return (<Format.Values.TupleValue>result).value.map(({ value }) =>
        nativize(value)
      );
    case "magic":
      return Object.assign(
        {},
        ...Object.entries((<Format.Values.MagicValue>result).value).map(
          ([key, value]) => ({ [key]: nativize(value) })
        )
      );
    case "enum":
      return enumFullName(<Format.Values.EnumValue>result);
    case "contract": {
      let coercedResult = <Format.Values.ContractValue>result;
      switch (coercedResult.value.kind) {
        case "known":
          return `${coercedResult.value.class.typeName}(${
            coercedResult.value.address
          })`;
        case "unknown":
          return coercedResult.value.address;
      }
      break; //to satisfy typescript
    }
    case "function":
      switch (result.type.visibility) {
        case "external": {
          let coercedResult = <Format.Values.FunctionExternalValue>result;
          switch (coercedResult.value.kind) {
            case "known":
              return `${coercedResult.value.contract.class.typeName}(${
                coercedResult.value.contract.address
              }).${coercedResult.value.abi.name}`;
            case "invalid":
              return `${coercedResult.value.contract.class.typeName}(${
                coercedResult.value.contract.address
              }).call(${coercedResult.value.selector}...)`;
            case "unknown":
              return `${coercedResult.value.contract.address}.call(${
                coercedResult.value.selector
              }...)`;
          }
        }
        case "internal": {
          let coercedResult = <Format.Values.FunctionInternalValue>result;
          switch (coercedResult.value.kind) {
            case "function":
              return `${coercedResult.value.definedIn.typeName}.${
                coercedResult.value.name
              }`;
            case "exception":
              return coercedResult.value.deployedProgramCounter === 0
                ? `<zero>`
                : `assert(false)`;
            case "unknown":
              return `<decoding not supported>`;
          }
        }
      }
  }
}
