import debugModule from "debug";
const debug = debugModule("codec:export");

import OS from "os";
import util from "util";
import * as Format from "@truffle/codec/format";
import type {
  CalldataDecoding,
  LogDecoding,
  ReturndataDecoding,
  AbiArgument
} from "@truffle/codec/types";
import * as Conversion from "@truffle/codec/conversion";

import {
  ResultInspector,
  unsafeNativize,
  unsafeNativizeVariables,
  InspectOptions,
  nativizeAccessList
} from "@truffle/codec/format/utils/inspect";
export {
  ResultInspector,
  unsafeNativize,
  unsafeNativizeVariables,
  nativizeAccessList
};

type NumberFormatter = (n: BigInt) => any; //not parameterized since we output any anyway

//HACK; this was going to be parameterized
//but TypeScript didn't like that, so, whatever
interface MixedArray extends Array<any> {
  [key: string]: any;
}

/**
 * Options for the nativize function.
 */
export interface NativizeOptions {
  /**
   * This is a function that is used to describe how to format
   * integer values.  It should take as input the number as a BigInt.
   * By default, it's the identity function (i.e., it formats the numbers
   * as BigInts), but by setting it you could instead format numbers as
   * a BN, BigNumber, string, etc.
   */
  numberFormatter?: NumberFormatter;
  /**
   * The format for the nativized result.  Currently the only supported
   * format is "ethers", which nativizes things in a way compatible with how
   * Ethers decodes values.  This format is quite limited, but more may be
   * added in the future.  There is also the separate function
   * [[Format.Utils.Inspect.unsafeNativize|unsafeNativize]], although that is,
   * as noted, unsafe.
   */
  format?: "ethers";
}

/**
 * This function is similar to
 * [[Format.Utils.Inspect.unsafeNativize|unsafeNativize]], but is intended to
 * be safe, and also allows for different output formats.  The only currently
 * supported format is "ethers", which is intended to match the way that
 * Truffle Contract currently returns values (based on the Ethers decoder).  As
 * such, it only handles ABI types, and in addition does not handle the types
 * fixed, ufixed, or function.  Note that in these cases it returns `undefined`
 * rather than throwing, as we want this function to be used in contexts where
 * it had better not throw.  It also does not handle circularities, for similar
 * reasons.
 *
 * To handle numeric types, this function takes an optional numberFormatter
 * option that tells it how to handle numbers; this function should take a
 * BigInt as input.  By default, this function will be the identity, and so
 * numbers will be represented as BigInts.
 *
 * Note that this function begins by calling abify, so out-of-range enums (that
 * aren't so out-of-range as to be padding errors) will not return `undefined`.
 * Out-of-range booleans similarly will return true rather than `undefined`.
 * However, other range errors may return `undefined`; this may technically be a
 * slight incompatibility with existing behavior, but should not be relevant
 * except in quite unusual cases.
 *
 * In order to match the behavior for tuples, tuples will be transformed into
 * arrays, but named entries will additionally be keyed by name.  Moreover,
 * indexed variables of reference type will be nativized to an undecoded hex
 * string.
 */
export function nativize(
  result: Format.Values.Result,
  options: NativizeOptions = {}
): any {
  const numberFormatter = options.numberFormatter || (x => x);
  const format = options.format || "ethers";
  switch (format) {
    case "ethers":
      return ethersCompatibleNativize(result, numberFormatter);
  }
}

function ethersCompatibleNativize(
  result: Format.Values.Result,
  numberFormatter: NumberFormatter = x => x
): any {
  //note: the original version of this function began by calling abify,
  //but we don't do that here because abify requires a userDefinedTypes
  //parameter and we don't want that.
  //However, it only needs that to handle getting the types right.  Since
  //we don't care about that here, we instead do away with abify and handle
  //such matters ourselves (which is less convenient, yeah).
  switch (result.kind) {
    case "error":
      switch (result.error.kind) {
        case "IndexedReferenceTypeError":
          //strictly speaking for arrays ethers will fail to decode
          //rather than do this, but, eh
          return result.error.raw;
        case "EnumOutOfRangeError":
          return numberFormatter(Conversion.toBigInt(result.error.rawAsBN));
        default:
          return undefined;
      }
    case "value":
      switch (result.type.typeClass) {
        case "uint":
        case "int":
          const asBN = (<Format.Values.UintValue | Format.Values.IntValue>(
            result
          )).value.asBN;
          return numberFormatter(Conversion.toBigInt(asBN));
        case "enum":
          const numericAsBN = (<Format.Values.EnumValue>result).value
            .numericAsBN;
          return numberFormatter(Conversion.toBigInt(numericAsBN));
        case "bool":
          return (<Format.Values.BoolValue>result).value.asBoolean;
        case "bytes":
          const asHex = (<Format.Values.BytesValue>result).value.asHex;
          return asHex !== "0x" ? asHex : null;
        case "address":
          return (<Format.Values.AddressValue>result).value.asAddress;
        case "contract":
          return (<Format.Values.ContractValue>result).value.address;
        case "string": {
          const coercedResult = <Format.Values.StringValue>result;
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
        case "userDefinedValueType":
          return ethersCompatibleNativize(
            (<Format.Values.UserDefinedValueTypeValue>result).value,
            numberFormatter
          );
        case "array":
          return (<Format.Values.ArrayValue>result).value.map(value =>
            ethersCompatibleNativize(value, numberFormatter)
          );
        case "tuple":
        case "struct":
          //in this case, we need the result to be an array, but also
          //to have the field names (where extant) as keys
          const nativized: MixedArray = [];
          const pairs = (<Format.Values.TupleValue | Format.Values.StructValue>(
            result
          )).value;
          for (const { name, value } of pairs) {
            const nativizedValue = ethersCompatibleNativize(
              value,
              numberFormatter
            );
            nativized.push(nativizedValue);
            if (name) {
              nativized[name] = nativizedValue;
            }
          }
          return nativized;
        case "function":
          switch (result.type.visibility) {
            case "external":
              const coercedResult = <Format.Values.FunctionExternalValue>result;
              //ethers per se doesn't handle this, but web3's hacked version will
              //sometimes decode these as just a bytes24, so let's do that
              return (
                coercedResult.value.contract.address.toLowerCase() +
                coercedResult.value.selector.slice(2)
              );
            case "internal":
              return undefined;
          }
        case "fixed":
        case "ufixed":
        default:
          return undefined;
      }
  }
}

/**
 * This function is similar to [[nativize]], but takes
 * a [[ReturndataDecoding]].  If there's only one returned value, it
 * will be run through compatibleNativize but otherwise unaltered;
 * otherwise the results will be put in an object.
 *
 * Note that if the ReturndataDecoding is not a [[ReturnDecoding]],
 * this will just return `undefined`.
 */
export function nativizeReturn(
  decoding: ReturndataDecoding,
  options: NativizeOptions = {}
): any {
  const numberFormatter = options.numberFormatter || (x => x);
  const format = options.format || "ethers";
  switch (format) {
    case "ethers":
      return ethersCompatibleNativizeReturn(decoding, numberFormatter);
  }
}

function ethersCompatibleNativizeReturn(
  decoding: ReturndataDecoding,
  numberFormatter: NumberFormatter = x => x
): any {
  if (decoding.kind !== "return") {
    return undefined;
  }
  if (decoding.arguments.length === 1) {
    return ethersCompatibleNativize(
      decoding.arguments[0].value,
      numberFormatter
    );
  }
  const result: any = {};
  for (let i = 0; i < decoding.arguments.length; i++) {
    const { name, value } = decoding.arguments[i];
    const nativized = ethersCompatibleNativize(value, numberFormatter);
    result[i] = nativized;
    if (name) {
      result[name] = nativized;
    }
  }
  return result;
}

/**
 * This function is similar to [[compatibleNativize]], but takes
 * a [[LogDecoding]], and puts the results in an object.  Note
 * that this does not return the entire event info, but just the
 * `args` for the event.
 */
export function nativizeEventArgs(
  decoding: LogDecoding,
  options: NativizeOptions = {}
): any {
  const numberFormatter = options.numberFormatter || (x => x);
  const format = options.format || "ethers";
  switch (format) {
    case "ethers":
      return ethersCompatibleNativizeEventArgs(decoding, numberFormatter);
  }
}

function ethersCompatibleNativizeEventArgs(
  decoding: LogDecoding,
  numberFormatter: NumberFormatter = x => x
): any {
  const result: any = {};
  for (let i = 0; i < decoding.arguments.length; i++) {
    const { name, value } = decoding.arguments[i];
    const nativized = ethersCompatibleNativize(value, numberFormatter);
    result[i] = nativized;
    if (name) {
      result[name] = nativized;
    }
  }
  //note: if you have an argument named __length__, what ethers
  //actually does is... weird.  we're just going to do this instead,
  //which is simpler and probably more useful, even if it's not strictly
  //the same (I *seriously* doubt anyone was relying on the old behavior,
  //because it's, uh, not very useful)
  result.__length__ = decoding.arguments.length;
  return result;
}

/**
 * Similar to [[ResultInspector]], but for a [[CalldataDecoding]].
 * See [[ResultInspector]] for more information.
 */
export class CalldataDecodingInspector {
  decoding: CalldataDecoding;

  constructor(decoding: CalldataDecoding) {
    this.decoding = decoding;
  }
  /**
   * @dev non-standard alternative interface name used by browser-util-inspect
   *      package
   */
  inspect(depth: number | null, options: InspectOptions): string {
    return this[util.inspect.custom].bind(this)(depth, options);
  }
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    switch (this.decoding.kind) {
      case "function":
        const fullName = `${this.decoding.class.typeName}.${this.decoding.abi.name}`;
        return formatFunctionLike(fullName, this.decoding.arguments, options);
      case "constructor":
        return formatFunctionLike(
          `new ${this.decoding.class.typeName}`,
          this.decoding.arguments,
          options
        );
      case "message":
        const { data, abi } = this.decoding;
        //we'll set up a value and inspect that :)
        const codecValue: Format.Values.BytesDynamicValue = {
          kind: "value" as const,
          type: {
            typeClass: "bytes" as const,
            kind: "dynamic" as const
          },
          value: {
            asHex: data
          }
        };
        if (abi) {
          return formatFunctionLike(
            `${this.decoding.class.typeName}.${abi.type}`,
            [{ value: codecValue }],
            options,
            true // we don't need to see the type here!
          );
        } else {
          return `Sent raw data to ${
            this.decoding.class.typeName
          }: ${util.inspect(new ResultInspector(codecValue), options)}`;
        }
      case "unknown":
        return "Receiving contract could not be identified.";
      case "create":
        return "Created contract could not be identified.";
    }
  }
}

export function containsDeliberateReadError(
  result: Format.Values.Result
): boolean {
  switch (result.kind) {
    case "value":
      switch (result.type.typeClass) {
        case "struct":
          //this is currently only intended for use with storage variables, so I
          //won't bother with handling tuple, magic, options
          return (result as Format.Values.StructValue).value.some(({ value }) =>
            containsDeliberateReadError(value)
          );
        case "array":
          return (result as Format.Values.ArrayValue).value.some(
            containsDeliberateReadError
          );
        case "mapping":
          return (result as Format.Values.MappingValue).value.some(
            ({ value }) => containsDeliberateReadError(value)
          );
        default:
          return false;
      }
    case "error":
      switch (result.error.kind) {
        case "StorageNotSuppliedError":
          return true;
        default:
          return false;
      }
  }
}

/**
 * Similar to [[ResultInspector]], but for a [[LogDecoding]].
 * See [[ResultInspector]] for more information.
 */
export class LogDecodingInspector {
  decoding: LogDecoding;
  constructor(decoding: LogDecoding) {
    this.decoding = decoding;
  }
  /**
   * @dev non-standard alternative interface name used by browser-util-inspect
   *      package
   */
  inspect(depth: number | null, options: InspectOptions): string {
    return this[util.inspect.custom].bind(this)(depth, options);
  }
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    const className = this.decoding.definedIn
      ? this.decoding.definedIn.typeName
      : this.decoding.class.typeName;
    const eventName = this.decoding.abi.name;
    const fullName = `${className}.${eventName}`;
    switch (this.decoding.kind) {
      case "event":
        return formatFunctionLike(fullName, this.decoding.arguments, options);
      case "anonymous":
        return formatFunctionLike(
          `<anonymous> ${fullName}`,
          this.decoding.arguments,
          options
        );
    }
  }
}

/**
 * Similar to [[ResultInspector]], but for a [[ReturndataDecoding]].
 * See [[ResultInspector]] for more information.
 */
export class ReturndataDecodingInspector {
  decoding: ReturndataDecoding;
  constructor(decoding: ReturndataDecoding) {
    this.decoding = decoding;
  }
  /**
   * @dev non-standard alternative interface name used by browser-util-inspect
   *      package
   */
  inspect(depth: number | null, options: InspectOptions): string {
    return this[util.inspect.custom].bind(this)(depth, options);
  }
  [util.inspect.custom](depth: number | null, options: InspectOptions): string {
    switch (this.decoding.kind) {
      case "return":
        return formatFunctionLike(
          "Returned values: ",
          this.decoding.arguments,
          options
        );
      case "returnmessage":
        const { data } = this.decoding;
        //we'll just set up a value and inspect that :)
        const codecValue: Format.Values.BytesDynamicValue = {
          kind: "value" as const,
          type: {
            typeClass: "bytes" as const,
            kind: "dynamic" as const
          },
          value: {
            asHex: data
          }
        };
        const dataString = util.inspect(
          new ResultInspector(codecValue),
          options
        );
        return `Returned raw data: ${dataString}`;
      case "selfdestruct":
        return "The contract self-destructed.";
      case "failure":
        return "The transaction reverted without a message.";
      case "revert":
        const name = this.decoding.definedIn
          ? `${this.decoding.definedIn.typeName}.${this.decoding.abi.name}`
          : this.decoding.abi.name;
        return formatFunctionLike(
          `Error thrown:${OS.EOL}${name}`,
          this.decoding.arguments,
          options
        );
      case "bytecode":
        //this one gets custom handling :P
        const contractKind = this.decoding.class.contractKind || "contract";
        const firstLine =
          this.decoding.address !== undefined
            ? `Returned bytecode for a ${contractKind} ${this.decoding.class.typeName} at ${this.decoding.address}.`
            : `Returned bytecode for a ${contractKind} ${this.decoding.class.typeName}.`;
        if (this.decoding.immutables && this.decoding.immutables.length > 0) {
          const prefixes = this.decoding.immutables.map(
            ({ name, class: { typeName } }) => `${typeName}.${name}: `
          );
          const maxLength = Math.max(...prefixes.map(prefix => prefix.length));
          const paddedPrefixes = prefixes.map(prefix =>
            prefix.padStart(maxLength)
          );
          const formattedValues = this.decoding.immutables.map(
            (value, index) => {
              const prefix = paddedPrefixes[index];
              const formatted = indentExcludingFirstLine(
                util.inspect(new ResultInspector(value.value), options),
                maxLength
              );
              return prefix + formatted;
            }
          );
          return `Immutable values:${OS.EOL}${formattedValues.join(OS.EOL)}`;
        } else {
          return firstLine;
        }
      case "unknownbytecode":
        return "Bytecode was returned, but it could not be identified.";
    }
  }
}

//copied from TestRunner, but simplified for our purposes :)
function indentArray(input: string[], indentation: number): string[] {
  return input.map(line => " ".repeat(indentation) + line);
}

//copied from TestRunner, but simplified for our purposes :)
function indentExcludingFirstLine(input: string, indentation: number): string {
  const lines = input.split(/\r?\n/);
  return [lines[0], ...indentArray(lines.slice(1), indentation)].join(OS.EOL);
}

//used for formatting things that look like function calls:
//events (including anonymous events), identifiable transactions,
//and revert messages
//"header" param should include everything before the initial parenthesis
/**
 * @hidden
 */
export function formatFunctionLike(
  header: string,
  values: AbiArgument[],
  options: InspectOptions,
  suppressType: boolean = false,
  indent: number = 2 //for use by debug-utils
): string {
  if (values.length === 0) {
    return `${header}()`;
  }
  let formattedValues = values.map(({ name, indexed, value }, index) => {
    const namePrefix = name ? `${name}: ` : "";
    const indexedPrefix = indexed ? "<indexed> " : "";
    const prefix = namePrefix + indexedPrefix;
    const displayValue = util.inspect(new ResultInspector(value), options);
    const typeString = suppressType
      ? ""
      : ` (type: ${Format.Types.typeStringWithoutLocation(value.type)})`;
    return indentExcludingFirstLine(
      prefix +
        displayValue +
        typeString +
        (index < values.length - 1 ? "," : ""),
      2 * indent
    );
  });
  return `${header}(${OS.EOL}${indentArray(formattedValues, indent).join(
    OS.EOL
  )}${OS.EOL})`;
}
