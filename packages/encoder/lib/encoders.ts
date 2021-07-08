import debugModule from "debug";
const debug = debugModule("encoder:encoders");

import { FixedNumber as EthersFixedNumber } from "@ethersproject/bignumber";
import { getAddress } from "@ethersproject/address";
import * as Codec from "@truffle/codec";
import type * as Abi from "@truffle/abi-utils";
import * as Types from "./types";
import Big from "big.js";
import type { Provider } from "web3/providers";
import Web3 from "web3";
import * as Utils from "./utils";
import {
  NoInternalInfoError,
  UnlinkedContractError,
  NoBytecodeError,
  InvalidAddressError,
  NoNetworkError,
  ContractNotFoundError,
  ContractNotDeployedError
} from "./errors";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import { Shims } from "@truffle/compile-common";
//sorry for untyped imports!
const { default: ENS, getEnsAddress } = require("@ensdomains/ensjs");
const Web3Utils = require("web3-utils");

const nonIntegerMessage = "Input value was not an integer";

interface ENSCache {
  [name: string]: string | null;
}

/**
 * The ProjectEncoder class.  Can wrap values; can also encode transactions and
 * resolve overloads if sufficient information is provided.  See below for a
 * method listing.
 * @category Encoder
 */
export class ProjectEncoder {
  private provider: Provider | null;
  private ens: any | null; //any should be ENS, sorry >_>
  private registryAddress: string | undefined = undefined;
  private ensCache: ENSCache = {};
  private allocations: Codec.Evm.AllocationInfo;
  private userDefinedTypes: Codec.Format.Types.TypesById;
  private networkId: number | null;

  /**
   * @protected
   */
  public getAllocations(): Codec.Evm.AllocationInfo {
    return this.allocations;
  }

  /**
   * Just used for testing, currently
   * @protected
   */
  public getUserDefinedTypes(): Codec.Format.Types.TypesById {
    return this.userDefinedTypes;
  }

  /**
   * @protected
   */
  public getNetworkId(): number | null {
    return this.networkId;
  }

  /**
   * @protected
   */
  constructor(info: Types.EncoderInfoInternal) {
    //first, set up the basic info that we need to run
    if (info.userDefinedTypes && info.allocations) {
      this.userDefinedTypes = info.userDefinedTypes;
      this.allocations = info.allocations;
    } else {
      if (!info.compilations) {
        throw new NoInternalInfoError();
      }
      let definitions: { [compilationId: string]: Codec.Ast.AstNodes };
      ({
        definitions,
        types: this.userDefinedTypes
      } = Codec.Compilations.Utils.collectUserDefinedTypesAndTaggedOutputs(info.compilations));
      const {
        allocationInfo
      } = Codec.AbiData.Allocate.Utils.collectAllocationInfo(info.compilations);

      this.allocations = {};
      //only doing the relevant allocations: abi & calldata
      this.allocations.abi = Codec.AbiData.Allocate.getAbiAllocations(
        this.userDefinedTypes
      );
      this.allocations.calldata = Codec.AbiData.Allocate.getCalldataAllocations(
        allocationInfo,
        definitions,
        this.userDefinedTypes,
        this.allocations.abi
      );
      this.provider = info.provider || null;
      if (info.registryAddress !== undefined) {
        this.registryAddress = info.registryAddress;
      }
    }

    this.networkId = info.networkId || null;
  }

  /**
   * @protected
   */
  public async init(): Promise<void> {
    if (this.provider) {
      if (this.registryAddress !== undefined) {
        this.ens = new ENS({
          provider: this.provider,
          ensAddress: this.registryAddress
        });
      } else {
        //if we weren't given a registry address, we use the default one,
        //but what is that?  We have to look it up.
        //NOTE: ENS is supposed to do this for us in the constructor,
        //but due to a bug it doesn't.
        const networkId = await new Web3(this.provider).eth.net.getId();
        const registryAddress: string | undefined = getEnsAddress(networkId);
        if (registryAddress) {
          this.ens = new ENS({
            provider: this.provider,
            ensAddress: registryAddress
          });
        } else {
          //there is no default registry on this chain
          this.ens = null;
        }
      }
    } else {
      this.ens = null;
    }
  }

  /**
   * **This method is asynchronous.**
   *
   * This is a restricted version of [[wrap]], which only handles elementary
   * types and values (those that can be used as mapping keys in Solidity);
   * it's present here for type convenience.  See the [[wrap]] documentation
   * for further information.
   */
  public async wrapElementaryValue(
    dataType: Codec.Format.Types.ElementaryType,
    input: unknown
  ): Promise<Codec.Format.Values.ElementaryValue> {
    return <Codec.Format.Values.ElementaryValue>(
      await this.wrap(dataType, input)
    );
  }

  /**
   * **This method is asynchronous.**
   *
   * This method recognizes user input for a given data type and attempts
   * to interpret it as a value of that type.  It will throw a
   * [[TypeMismatchError]] if it cannot do this.
   *
   * The `input` argument may come in a number of forms, depending on the
   * target data type.  A list of the specific inputs accepted for each type is
   * below.  However first we must note a few generic forms that inputs are
   * accepted in.
   *
   * Inputs may be given as an object of the form `{ type: ..., value: ... }`
   * (additional fields not allowed), where `type` is a string describing the
   * type, and `value` is anything that would be accepted for that type.  This
   * form of input is not very useful with *this* method, but it is useful when
   * performing overload resolution (see [[resolveAndWrap]]) to restrict the
   * overloads that will be selected from.  Note that for arrays, `type` should
   * simply be `"array"`; for structs and tuples, `"struct"` or `"tuple"`; for
   * addresses and contracts, `"address"` or `"contract"`; for external
   * functions, `"function"`; for transaction options, `"options"`; and for
   * enums, it can be either `"enum"` (or the underlying uint type).  For other
   * Solidity types, it should be the name of the type; note that `"uint"`,
   * `"int"`, `"fixed"`, `"ufixed"`, and `"byte"` are accepted.
   *
   * Note that input in the form of a [[Format.Values.Value|Value]] is
   * accepted, so long as the type is appropriate, but error results are
   * typically not accepted (exceptions are discussed below).
   *
   * Now then, the list of accepted inputs by type, excluding the above:
   *
   * **Strings**: The input may be a string (or `String`), or it may be a
   * [[Format.Values.StringValue|StringValue]].  (The latter is the only
   * way to input invalid UTF-8.)  Strings with invalid UTF-16 will not be
   * accepted.
   *
   * **Bytestrings**: Bytestrings can be given in several forms.  Note that for
   * all forms of input, if the specified type is `bytesN`, it is OK if the
   * length of the input is shorter than N bytes; it will automatically be
   * right-padded with zero bytes in this case.  (The exception is if the input
   * is a [[Format.Values.BytesValue|BytesValue]] and strict checking is
   * on; see [[resolveAndWrap]].)  Bytestrings may be given as `"0x"`-prefixed
   * even-length hex strings (a `String` may be used in place of a string).
   * They may also be given as a `Uint8Array`, or anything resembling a
   * `Uint8Array` -- any object with a `length` field which is a `number`, and
   * which has fields from `0` to `length-1` all `number`s from 0 to 255, will
   * be accepted.  Input may also be given as a
   * [[Format.Values.BytesValue|BytesValue]]; the specific type does not
   * have to match unless strict checking is on.  Finally, a bytestring may be
   * given as an object with just the fields `text` and `encoding`; in this
   * case, `text` should be a string (it must not have invalid UTF-16) and
   * `encoding` an encoding to encode it as.  The only supported encoding
   * currently is `"utf8"`.
   *
   * **Integer types**: Input for integer types may take a variety of forms.
   * The input may be a `number` (or `Number`); note that if so it must be a
   * safe integer.  For larger integers, you must use other forms of input.
   * For instance, the input may be a `BigInt`.  The input may also be one
   * of several recognized big number classes:
   *   * [`BN`](https://github.com/indutny/bn.js)
   *   * [`Big`](https://github.com/MikeMcl/Big.js)
   *   * MikeMcl's [`BigNumber`](https://github.com/MikeMcl/bignumber.js)
   *   * Ethers's [`BigNumber` or `FixedNumber`](https://www.npmjs.com/package/@ethersproject/bignumber)
   * Of course, any numeric input, no matter the format, must be integral.
   * Input may also take the form of a numeric string (or `String`).
   * The string may be decimal, but it may also be hexadecimal with `"0x"`
   * prefix, octal with `"0o"` prefix, or binary with `"0xb"` prefix.
   * You can also use a negated hexadecimal, octal, or binary string to
   * represent a negative number.  Whitespace before or after the number is OK.
   * For decimal strings, scientific notation (e.g. `1.1e4`) is also accepted.
   * It is also possible to affix one of the units `"wei"`, `"gwei"`,
   * `"shannon"`, `"finney"`, `"szabo"`, or `"ether"` (these are case-insensitive)
   * onto a decimal numeric string (you may include space inbetween the
   * quantity and the unit) to act as a multiplier (where here the
   * assumption is that 1 wei means the number 1).  You may also use a
   * unit by itself, with no specified quantity, to mean 1 of that unit.
   * (E.g., an input of `"wei"` will be interpreted as 1.)  Note that it's OK
   * if the quantity before the unit is not itself an integer, so long as the
   * overall resulting quantity is an integer; e.g., "1.1 gwei" is legal integer
   * input.  In addition to giving the input in any of these obviously numeric
   * forms, the input may also be given a a `Uint8Array` or anything that
   * mimics one (see above about bytestrings); in this case the input will
   * be interpreted as the big-endian byte representation of an unsigned
   * integer (or in other words, it will be interpreted as base 256).
   * Negative numbers cannot be represented in this way.
   * Finally, the input may be given as a
   * [[Format.Values.UintValue|UintValue]],
   * [[Format.Values.IntValue|IntValue]],
   * [[Format.Values.UfixedValue|UfixedValue]],
   * [[Format.Values.FixedValue|FixedValue]], or
   * [[Format.Values.EnumValue|EnumValue]]; the type is not required to
   * match unless strict checking is on (see [[resolveAndWrap]]), in which case
   * the type must match exactly.  In addition, the input may also be a
   * [[Format.Errors.EnumErrorResult|EnumErrorResult]] so long as
   * the error is a
   * [[Format.Errors.EnumOutOfRangeError|EnumOutOfRangeError]];
   * other types of error results are not accepted.
   *
   * **Enums**: Enums accept all the same forms of input as integer types.
   * However, if the encoder is aware that a particular argument or field is in
   * fact an enum and not just an integer, it accepts one additional form of
   * input; the input may be a string (or `String`) containing the name of the
   * enumerated option.  So, for instance, given the following Solidity code:
   * ```solidity
   * contract MyContract {
   *   enum Ternary {
   *     No, Yes, Maybe
   *   }
   * }
   * ```
   * then `"Yes"` would be a valid input for an enum of type
   * `MyContract.Ternary`.  Moreover, `"Ternary.Yes"` and
   * `"MyContract.Ternary.Yes"` would also work; these latter forms will only
   * match enum types with the appropriate name and optionally defining
   * contract, so you can use these to restrict matching for overload
   * resolution, much like type/value input.  Note these forms do not require
   * the enum to be defined inside of a contract; those defined outside of
   * contracts are supported too, so long as the encoder was initialized to
   * know about them.
   *
   * **Addresses and contracts**: Input may be given as a hex string
   * representing 20 bytes, with capitalization according to the Ethereum
   * address checksum.  The `"0x"` prefix is optional.  If the hex string
   * is all lowercase or all uppercase, however, then the checksum check will
   * be skipped, and the input accepted regardless.  Input may also be given
   * as an ICAP address; again, the checksum must be correct.  Finally, if ENS
   * resolution has been configured, input may be given as an ENS name.
   * All of these may also be given as `String`s instead of strings.
   * Input may also be given as an object with an `address` field, although the
   * contents of that address field must be a `"0x"`-prefixed hex string (not
   * `String`), and not any other address format.  Input may also be given
   * as a [[Format.Values.AddressValue|AddressValue]] or
   * [[Format.Values.ContractValue|ContractValue]]; the specific type
   * does not matter.
   *
   * **Booleans**: Almost any input is accepted (as long as it's not type/value
   * input for a different type), but how it is interpreted depends on the
   * input.  A boolean will be interpreted in the obvious way, and a `Boolean`
   * will be unwrapped.  A string will be considered true unless it is falsy or
   * is equal (ignoring case) to the string `"false"`.  A `String` will be
   * considered true if and only if the underlying string is.  A number will be
   * considered true so long as it is truthy, and a `Number` will be considered
   * true if and only if the underlying number is.  A
   * [[Format.Values.BoolValue|BoolValue]] will be considered true so
   * long as it represents a true value.  Moreover, two types of
   * [[Format.Errors.BoolErrorResult|BoolErrorResult]] also count as
   * true: Those where the error is a
   * [[Format.Errors.BoolOutOfRangeError|BoolOutOfRangeError]] and
   * those where the error is a
   * [[Format.Errors.BoolPaddingError|BoolPaddingError]].  All other
   * error results, and all [[Format.Values.Value|Values]] that are not
   * [[Format.Values.BoolValue|BoolValues]], will be rejected.  All other
   * inputs will be considered true so long as they are truthy.
   *
   * **Decimal fixed-point types**: Input for fixed-point decimal types is
   * similar to input for integer types.  The differences are as follows:
   *   * Units are not accepted in numeric strings (or `String`s).
   *   * Hexadecimal, octal, and binary strings (or `String`s) are not
   *     accepted.
   *   * `Uint8Array`s, or objects that mimic them, are not accepted.
   *   * Numeric values do not have to be integral.
   * Note that if the input is a `number` (or `Number`) or MikeMcl
   * [BigNumber](https://github.com/MikeMcl/bignumber.js), it must be a finite
   * value.  Also, the number of decimal places in the input may not exceed the
   * number of decimal places allowed in the type.  Finally, just as integer
   * types do not allow `number`s (or `Number`s) that are unsafe integers as
   * input, decimal types will not accept a `number` (or `Number`) as input if
   * that `number` is outside the safe range for that type, i.e., it is large
   * enough that there may be loss of precision.  (This means that `1` is not
   * valid input for a `fixed128x18`!)  Using other, safer, forms of input is
   * encouraged.
   *
   * **Arrays**: The input may be an array, or it may be a
   * [[Format.Values.ArrayValue|ArrayValue]].  In the latter case,
   * whether it is static-length or dynamic-length does not need to match
   * (unless strict checking is on, see [[resolveAndWrap]]).
   *
   * **Structs and tuples**: The input can be given either as an array or as an
   * object.  If given as an array, the elements should be the members of the
   * struct/tuple, in order.  If given as an object, it should be keyed by the
   * struct or tuple's field names; if any of the elements of the tuple are
   * unnamed, then input cannot be given as an object.  (Note that if the
   * tuple's fields are precisely `type` and `value`, you will either want to make
   * sure you do not give `type` as a native string (a `String` instead will work),
   * or else that you give your input in some other form, such as an array...)
   * Additional keys are also allowed unless strict checking is on.
   * Input may also be given as a [[Format.Values.StructValue|StructValue]]
   * or [[Format.Values.TupleValue|TupleValue]]; the specific type
   * does not matter.
   *
   * **External function pointers**: These may be given as an object with fields
   * `address` and `selector` (additional fields are allowed); the `address`
   * field may be anything that would be recognized as an address (see above),
   * and the `selector` field may be anything that would be recgonized as a
   * `bytes4` (see above).  Alternatively, this may be given as a bytestring
   * (even length `"0x"`-prefixed hex string or `String`) of 24 bytes,
   * specifying the address followed by the selector; in this case, the address
   * does not need to be checksummed.  Finally, input may of course also be
   * given as a
   * [[Format.Values.FunctionExternalValue|FunctionExternalValue]];
   * its more specific type does not matter.
   *
   * * Transaction options: These are given as an object with fields for the
   * desired options (you can leave options out or have them be `undefined` and
   * they'll be ignored).  Note that, in order to maintain compatibility with
   * older versions of Truffle, additional keys are accepted, but there must be
   * at least one key that belongs in a transaction options object.  Note that
   * if any field exists, and is not `undefined`, but the value of that field
   * cannot be interpreted as input of the appropriate type, the input will be
   * rejected.  Otherwise, inputs for each field can be anything that the
   * encoder will understand for this field.  Accepted fields are:
   *   * `gas`, `gasPrice`, `value`, `nonce`: These take integer input
   *     (see above).
   *   * `from`, `to`: These take address input (see above)
   *   * `data`: This takes `bytes` input (see above)
   *   * `overwrite`: This takes boolean input (see above)
   *   * `privateFor`: This one is a special case, and requires a specific
   *     form of input.  Input must be an array of base64-encoded
   *     bytestrings (as strings or `String`s), each with a decoded length of
   *     32 bytes.
   * In addition, input may also be given as a
   * [[Format.Values.OptionsValue|OptionsValue]].
   *
   * @param dataType The data type that the given value is to be interpreted
   *   as.
   * @param input The value to be interpreted.  This can take a number of
   *   forms depending on the data type, as documented above.
   * @return The interpreted value wrapped as a [[Format.Values.Value|Value]]
   *   object.
   */
  public async wrap(
    dataType: Codec.Format.Types.Type,
    input: unknown
  ): Promise<Codec.Format.Values.Value> {
    return await this.driveGenerator(
      Codec.Wrap.wrap(dataType, input, {
        userDefinedTypes: this.userDefinedTypes,
        loose: true
      })
    );
  }

  /**
   * **This method is asynchronous.**
   *
   * This method recognizes user input for a transaction.  It will throw
   * a [[TypeMismatchError]] if it cannot do this.
   *
   * If the `allowOptions` flag is set in the `options` argument, the input may
   * contain an additional transaction options argument after the other
   * arguments.
   *
   * @param method Contains information about the method (or constructor) being
   *   used for the transaction.
   * @param inputs An array of the inputs to the transaction.  May include a
   *   transaction options argument on the end if the `allowOptions` flag is
   *   set.
   * @param options Contains options to control the operation of this method.
   * @return The interpretation of the input, as a
   *   [[Resolution]] object.
   */
  public async wrapForTransaction(
    method: Codec.Wrap.Method,
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    debug("wrapForTransaction");
    return await this.driveGenerator(
      Codec.Wrap.wrapForMethod(method, inputs, {
        userDefinedTypes: this.userDefinedTypes,
        allowOptions: Boolean(options.allowOptions)
      })
    );
  }

  /**
   * **This method is asynchronous.**
   *
   * This method attempts to perform overload resolution given user input
   * to one of several possible methods.  If the given input matches more than
   * one of these methods, it will attempt to select the best match.
   *
   * If it is not possible for the given input to match any of the given methods,
   * either a [[TypeMismatchError]] or a
   * [[NoOverloadsMatchedError]] will be
   * thrown.  If more than one overload matches but none can be considered the
   * unique best, you will get a
   * [[NoUniqueBestOverloadError]].
   *
   * If the `allowOptions` flag is set in the `options` argument, the input may
   * contain an additional transaction options argument after the other
   * arguments.
   *
   * If it is necessary to perform overload resolution by type rather than
   * simply by length, the encoder will select among the overloads that
   * could work the one it considers to be the best match.  To be the best
   * match, it must be a best match for each argument.  An overload is
   * a best match for a given argument if the type it would assign that
   * argument is highest-priority among all types it could assign that
   * argument (selected from overloads that match overall).
   *
   * Note that when doing this the match checker will be somewhat stricter than
   * usual; inputs for structs/tuples will not be allowed to contain extra
   * keys, and if a value is given as a [[Format.Values.Value|Value]], it
   * will only match its specific type, rather than being allowed to match
   * other types as usual (unless it is itself wrapped in a type/value pair).
   *
   * The overall order of priority of types is as follows:
   * 1. transaction options
   * 2. arrays
   * 3. structs and tuples
   * 4. addresses and contracts
   * 5. bytestrings (`bytesN` and `bytes`)
   * 6. external function pointers
   * 7. numeric types
   * 8. `enum`s
   * 9. `string`
   * 10. `bool`
   *
   * (Note that if the encoder does not know that a certain argument is
   * supposed to be an enum, it will of course just be treated as the
   * underlying numeric type.)
   *
   * Moreover, within each category there is a priority ordering (which is
   * not always total).  Specifically:
   * * For arrays, if `S` has priority over `T`, then `S[]` has priority
   *   over `T[]`, and `S[n]` has priority over `T[n]`.  Moreover, `S[n]`
   *   has priority over `S[]` and so also over `T[]`.
   * * Structs and tuples mostly act the same as the overall arguments list; for
   *   one such type `S` to have priority over another type `T`, each
   *   member type of `S` must have priority over the corresponding member type
   *   of `T` (correspondence being determined by the order of the members).
   *   However, if the two types `S` and `T` also have exactly the same
   *   component names (and each has all of its components named), then
   *   this will also be checked with correspondence by name instead of
   *   position, and `S` will only be considered more specific than `T` if
   *   both checks pass.
   * * `bytesN` has priority over `bytesM` if `N<=M`, and has priority over
   *   `bytes`
   * * A numeric type `S` has priority over a numeric type `T` if the values
   *   representable by `S` are a subset of those representable by `T`.
   *
   * If you are not getting the overload you want, you can use explicit
   * type-value input as discussed in the documentation for [[wrap]], or you
   * can skip overload resolution and explicitly select an overload by other
   * means.  For enums you may also specify the enum type as documented in
   * [[wrap]].
   *
   * @param methods An array of [[Method]] objects we are
   *   attempting to decide between.
   * @param inputs An array of the inputs to the transaction.  May include a
   *   transaction options argument on the end if the `allowOptions` flag is
   *   set.
   * @param options Contains options to control the operation of this method.
   * @return The interpretation of the input and the resolved method, as a
   *   [[Resolution]] object.
   */
  public async resolveAndWrap(
    methods: Codec.Wrap.Method[],
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    return await this.driveGenerator(
      Codec.Wrap.resolveAndWrap(methods, inputs, {
        userDefinedTypes: this.userDefinedTypes,
        allowOptions: Boolean(options.allowOptions)
      })
    );
  }

  private async driveGenerator<T>(
    generator: Generator<Codec.WrapRequest, T, Codec.WrapResponse>
  ): Promise<T> {
    let response: Codec.WrapResponse;
    let next = generator.next();
    while (!next.done) {
      const request = next.value;
      debug("request: %O", request);
      // @ts-ignore: HACK HACK to make typedoc work
      // (the TS is fine with strict null checks on,
      // but typedoc has it turned off, so... :-/ )
      // please remove this ts-ignore once you turn on
      // strict null checks in typedoc
      response = await this.respond(request);
      debug("response: %O", response);
      next = generator.next(response);
    }
    debug("returning: %O", next.value);
    return next.value;
  }

  private async respond(
    request: Codec.WrapRequest
  ): Promise<Codec.WrapResponse> {
    switch (request.kind) {
      case "integer":
        return this.recognizeInteger(request.input);
      case "decimal":
        return this.recognizeDecimal(request.input);
      case "address":
        return await this.recognizeAddress(request.name);
    }
  }

  /**
   * **This method is asynchronous.**
   *
   * This method is similar to [[wrapForTransaction]], except instead of
   * returning a [[Resolution]] object, it returns
   * the resulting transaction options, including the encoded `data`.
   * Note any options not specified in a transaction options parameter
   * will be simply omitted; it is up to the caller to set these as
   * appropriate afterwards.
   *
   * If the transaction options parameter has a `data` option, this option will
   * be recognized but ignored.  Similarly, when encoding a contract creation,
   * the `to` option will be similarly ignored.
   *
   * See [[wrapForTransaction]] for documentation of the inputs.
   */
  public async encodeTransaction(
    method: Codec.Wrap.Method,
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    debug("encoding transaction");
    const resolution = await this.wrapForTransaction(method, inputs, options);
    const data = <Uint8Array>Codec.AbiData.Encode.encodeTupleAbiWithSelector(
      resolution.arguments,
      Codec.Conversion.toBytes(resolution.method.selector),
      this.allocations.abi
    );
    //note that the data option on resolution.options is ignored;
    //perhaps we can change this in the future, but for now we keep this
    //for compatibility
    let encoded = {
      ...resolution.options,
      data: Codec.Conversion.toHexString(data)
    };
    if (method.abi.type === "constructor") {
      delete encoded.to;
    }
    return encoded;
  }

  /**
   * **This method is asynchronous.**
   *
   * This method is similar to [[resolveAndWrap]], except instead of
   * returning a [[Resolution]] object, it returns
   * a pair containing the ABI for the resolved method together with
   * the resulting transaction options, including the encoded `data`.
   * Note any options not specified in a transaction options parameter
   * will be simply omitted; it is up to the caller to set these as
   * appropriate afterwards.
   *
   * If the transaction options parameter has a `data` option, this option will
   * be recognized but ignored.
   *
   * See [[wrapForTransaction]] for documentation of the inputs.
   */
  public async resolveAndEncode(
    methods: Codec.Wrap.Method[],
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Types.TxAndAbi> {
    debug("resolve & encode");
    const resolution = await this.resolveAndWrap(methods, inputs, options);
    const data = <Uint8Array>Codec.AbiData.Encode.encodeTupleAbiWithSelector(
      resolution.arguments,
      Codec.Conversion.toBytes(resolution.method.selector),
      this.allocations.abi
    );
    //note that the data option on resolution.options is ignored;
    //perhaps we can change this in the future, but for now we keep this
    //for compatibility
    return {
      tx: {
        ...resolution.options,
        data: Codec.Conversion.toHexString(data)
      },
      abi: <Abi.FunctionEntry>resolution.method.abi
    };
  }

  private recognizeInteger(input: unknown): Codec.IntegerWrapResponse {
    if (Utils.isBigNumber(input)) {
      if (input.isInteger()) {
        return {
          kind: "integer" as const,
          value: BigInt(input.toFixed())
        };
      } else {
        return {
          kind: "integer" as const,
          value: null,
          reason: nonIntegerMessage
        };
      }
    } else if (Utils.isEthersBigNumber(input)) {
      const asHexString = input.toHexString();
      const asBigInt =
        asHexString[0] === "-"
          ? -BigInt(asHexString.slice(1))
          : BigInt(asHexString);
      return {
        kind: "integer" as const,
        value: asBigInt
      };
    } else if (EthersFixedNumber.isFixedNumber(input)) {
      //they had to make this one a pain...
      const asString = input.toString();
      //problem: the string might still have trailing ".0" on the end,
      //so let's run it through something that recognizes that (hack?)
      const asBig = new Big(asString);
      if (Codec.Conversion.countDecimalPlaces(asBig) === 0) {
        return {
          kind: "integer" as const,
          value: BigInt(asBig.toFixed())
        };
      } else {
        return {
          kind: "integer" as const,
          value: null,
          reason: nonIntegerMessage
        };
      }
    } else {
      return {
        kind: "integer" as const,
        value: null
      };
    }
  }

  private recognizeDecimal(input: unknown): Codec.DecimalWrapResponse {
    if (Utils.isBigNumber(input)) {
      if (input.isFinite()) {
        return {
          kind: "decimal" as const,
          value: new Big(input.toFixed())
        };
      } else {
        return {
          kind: "decimal" as const,
          value: null,
          reason: "Input was not a finite value"
        };
      }
    } else if (Utils.isEthersBigNumber(input)) {
      //as before, this has to come after
      return {
        kind: "decimal" as const,
        value: new Big(input.toString())
      };
    } else if (EthersFixedNumber.isFixedNumber(input)) {
      return {
        kind: "decimal" as const,
        value: new Big(input.toString())
      };
    } else {
      return {
        kind: "decimal" as const,
        value: null
      };
    }
  }

  private async recognizeAddress(
    input: string
  ): Promise<Codec.AddressWrapResponse> {
    let address: string | null = null;
    try {
      address = getAddress(input); //maybe it's an ICAP address?
      return {
        kind: "address",
        address
      };
    } catch (error) {
      if (!error) {
        throw error; //rethrow unepxected errors
      }
      switch (error.reason) {
        case "bad address checksum":
          throw error; //this shouldn't happen!
        //we already checked for this ourselves!
        case "bad icap checksum":
          return {
            kind: "address",
            address: null,
            reason: "ICAP address had bad checksum"
          };
        case "invalid address":
          //in this case, try resolving it as an ENS name
          const address = await this.resolveENSName(input);
          if (address !== null) {
            return {
              kind: "address",
              address
            };
          } else {
            return {
              kind: "address",
              address: null,
              reason: "Input was not recognizable as an address or ENS name"
            };
          }
        default:
          throw error; //rethrow unexpected errors
      }
    }
  }

  private async resolveENSName(input: string): Promise<string | null> {
    if (this.ens === null) {
      return null;
    }
    if (input in this.ensCache) {
      return this.ensCache[input];
    }
    let address: string | null;
    try {
      address = await this.ens.name(input).getAddress();
    } catch {
      //Normally I'd rethrow unexpected errors, but given the context here
      //that seems like it might be a problem
      address = null;
    }
    if (address === Codec.Evm.Utils.ZERO_ADDRESS) {
      //ENS returns zero address to indicate "not found"
      address = null;
    }
    this.ensCache[input] = address;
    return address;
  }

  /**
   * **This method is asynchronous.**
   *
   * Constructs a contract encoder for a given contract in this project.
   * @param artifact The contract the encoder is for.  If you want to
   *   encode contract creation transactions, it must have all of
   *   its libraries linked.
   *
   *   Note: The contract must be one that the encoder knows about;
   *   otherwise you will have problems.
   */
  public async forArtifact(artifact: Artifact): Promise<ContractEncoder> {
    return new ContractEncoder(this, artifact);
  }

  /**
   * **This method is asynchronous.**
   *
   * Constructs a contract encoder for a given contract in this project.
   * @param contract The contract the encoder is for.  If you want to
   *   encode contract creation transactions, it must have all of
   *   its libraries linked.
   *
   *   Note: The contract must be one that the encoder knows about;
   *   otherwise you will have problems.
   */
  public async forContract(
    contract: Types.ContractConstructorObject
  ): Promise<ContractEncoder> {
    return new ContractEncoder(this, contract);
  }

  /**
   * **This method is asynchronous.**
   *
   * Constructs a contract instance encoder for a given contract instance.
   * @param artifact The artifact for the contract the encoder is for.  If you
   *   want to encode contract creation transactions, it must have all of its
   *   libraries linked.
   *
   *   Note: The contract must be one that the encoder knows about;
   *   otherwise you will have problems.
   * @param address The address of the contract instance.
   *   If omitted, but the project encoder has a provider or network ID,
   *   it will be autodetected.  If there is no provider or network ID,
   *   it must be included.
   *
   *   If an invalid address is provided, this method will throw an exception.
   */
  public async forInstance(
    artifact: Artifact,
    address?: string
  ): Promise<ContractInstanceEncoder> {
    const contractEncoder = await this.forArtifact(artifact);
    return await contractEncoder.forInstance(address);
  }
}

/**
 * The ContractEncoder class.
 * Can encode transactions, resolve overloads, and wrap values.
 * See below for a method listing.
 * @category Encoder
 */
export class ContractEncoder {
  private projectEncoder: ProjectEncoder;
  private contract: Artifact;
  private constructorBinary: string | undefined;
  private constructorContextHash: string | undefined;
  private deployedContextHash: string | undefined;

  /**
   * Just used for testing, currently
   * @protected
   */
  public getProjectEncoder(): ProjectEncoder {
    return this.projectEncoder;
  }

  /**
   * @protected
   */
  constructor(projectEncoder: ProjectEncoder, contract: Artifact) {
    this.projectEncoder = projectEncoder;
    this.contract = contract;
    //set up constructor binary w/resolved link references
    const networkId = this.projectEncoder.getNetworkId();
    const coercedContract = <Types.ContractConstructorObject>contract;
    const bytecode = Shims.NewToLegacy.forBytecode(contract.bytecode); //sorry, codec still uses legacy, to be changed in future
    const deployedBytecode = Shims.NewToLegacy.forBytecode(
      contract.deployedBytecode
    );
    //determine linked bytecode -- we'll determine it ourself rather than
    //using contract.binary
    const links = networkId !== null
      ? ((contract.networks || {})[networkId] || {links: {}}).links || {}
      : {};
    this.constructorBinary = Utils.link(bytecode, links);
    //now, set up context hashes
    if (bytecode && bytecode !== "0x") {
      this.constructorContextHash = Codec.Conversion.toHexString(
        Codec.Evm.Utils.keccak256({
          type: "string",
          value: bytecode //has link references unresolved
        })
      );
    }
    if (deployedBytecode && deployedBytecode !== "0x") {
      this.deployedContextHash = Codec.Conversion.toHexString(
        Codec.Evm.Utils.keccak256({
          type: "string",
          value: deployedBytecode //has link references unresolved
        })
      );
    }
    //finally: check that we have any necessary allocations for this contract!
    const allocations = this.projectEncoder.getAllocations();
    if (
      (this.constructorContextHash &&
        //@ts-ignore: allocations.calldata was set up earlier
        !allocations.calldata.constructorAllocations[
          this.constructorContextHash
        ]) ||
      (this.deployedContextHash &&
        //@ts-ignore: allocations.calldata was set up earlier
        !allocations.calldata.functionAllocations[this.deployedContextHash])
    ) {
      throw new ContractNotFoundError(
        contract.contractName,
        contract.bytecode,
        contract.deployedBytecode
      );
    }
  }

  /**
   * See [[ProjectEncoder.wrapElementaryValue]].
   */
  public async wrapElementaryValue(
    dataType: Codec.Format.Types.ElementaryType,
    input: unknown
  ): Promise<Codec.Format.Values.ElementaryValue> {
    return await this.projectEncoder.wrapElementaryValue(dataType, input);
  }

  /**
   * See [[ProjectEncoder.wrap]].
   */
  public async wrap(
    dataType: Codec.Format.Types.Type,
    input: unknown
  ): Promise<Codec.Format.Values.Value> {
    return await this.projectEncoder.wrap(dataType, input);
  }

  /**
   * **This method is asynchronous.**
   *
   * This method works similarly to [[ProjectEncoder.wrapForTransaction]].
   * However, instead of a Method object, it simply takes the ABI entry for
   * the transaction being prepared.  Note that the ABI must be one associated
   * with this contract, or the function will not work.
   *
   * Note that use of the encoder for transactions to be sent to libraries is
   * presently not supported and may have unreliable results.  Limited support
   * for this is planned for future versions.
   *
   * See [[ProjectEncoder.wrapForTransaction]] for further details.
   *
   * @param abi The ABI entry for the transaction being prepared.
   */
  public async wrapForTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const method = this.getMethod(abi);
    return await this.projectEncoder.wrapForTransaction(
      method,
      inputs,
      options
    );
  }

  /**
   * **This method is asynchronous.**
   *
   * This method works similarly to [[ProjectEncoder.resolveAndWrap]].
   * However, instead of an array of Method objects, it simply takes an array
   * of the ABI entries for the possible overloads.  Only function ABI entries
   * may be passed to this method, not constructor ABI entries.  Note that the
   * ABIs must be one associated with this contract, or the function will not
   * work.
   *
   * Note that use of the encoder for transactions to be sent to libraries is
   * presently not supported and may have unreliable results.  Limited support
   * for this is planned for future versions.
   *
   * See [[ProjectEncoder.resolveAndWrap]] for further details.
   *
   * @param abis The ABI entries for the overloads to be resolved between.
   */
  public async resolveAndWrap(
    abis: Abi.FunctionEntry[],
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const methods = abis.map(abi => this.getMethod(abi));
    //note we can't just write abis.map(this.getMethod)
    //because this would be undefined inside of it... I could
    //write abis.map(this.getMethod.bind(this)), but I find the
    //arrow way to be more readable
    return await this.projectEncoder.resolveAndWrap(methods, inputs, options);
  }

  /**
   * **This method is asynchronous.**
   *
   * This method works similarly to [[ProjectEncoder.encodeTransaction]].
   * However, instead of a Method object, it simply takes the ABI entry for
   * the transaction being prepared.  Note that the ABI must be one associated
   * with this contract, or the function will not work.
   *
   * Note that use of the encoder for transactions to be sent to libraries is
   * presently not supported and may have unreliable results.  Limited support
   * for this is planned for future versions.
   *
   * See [[ProjectEncoder.encodeTransaction]] for further details.
   *
   * @param abi The ABI entry for the transaction being prepared.
   */
  public async encodeTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    const method = this.getMethod(abi);
    return await this.projectEncoder.encodeTransaction(method, inputs, options);
  }

  /**
   * **This method is asynchronous.**
   *
   * This method works similarly to [[ProjectEncoder.resolveAndEncode]].
   * However, instead of an array of Method objects, it simply takes an array
   * of the ABI entries for the possible overloads.  Only function ABI entries
   * may be passed to this method, not constructor ABI entries.  Note that the
   * ABIs must be one associated with this contract, or the function will not
   * work.
   *
   * Note that use of the encoder for transactions to be sent to libraries is
   * presently not supported and may have unreliable results.  Limited support
   * for this is planned for future versions.
   *
   * See [[ProjectEncoder.resolveAndEncode]] for further details.
   *
   * @param abis The ABI entries for the overloads to be resolved between.
   */
  public async resolveAndEncode(
    abis: Abi.FunctionEntry[],
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Types.TxAndAbi> {
    const methods = abis.map(abi => this.getMethod(abi));
    //note we can't just write abis.map(this.getMethod)
    //because this would be undefined inside of it... I could
    //write abis.map(this.getMethod.bind(this)), but I find the
    //arrow way to be more readable
    return await this.projectEncoder.resolveAndEncode(methods, inputs, options);
  }

  /**
   * **This method is asynchronous.**
   *
   * Constructs a contract instance encoder for a given instance of the
   * contract this encoder is for.
   * @param address The address of the contract instance.
   *   If omitted, it will be autodetected.
   *   If an invalid address is provided, this method will throw an exception.
   */
  public async forInstance(address?: string): Promise<ContractInstanceEncoder> {
    if (address === undefined) {
      const networkId = this.projectEncoder.getNetworkId();
      if (networkId === null) {
        throw new NoNetworkError();
      }
      address = (this.contract.networks || {})[networkId].address;
      if (address === undefined) {
        throw new ContractNotDeployedError(
          this.contract.contractName,
          networkId
        );
      }
    }
    return new ContractInstanceEncoder(this, address);
  }

  private getMethod(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry
  ): Codec.Wrap.Method {
    const allocations = this.projectEncoder.getAllocations();
    debug("got allocations");
    switch (abi.type) {
      case "constructor": {
        debug("constructor binary: %s", this.constructorBinary);
        //first check that we have constructor binary, and that it's all linked
        if (!this.constructorBinary || this.constructorBinary === "0x") {
          throw new NoBytecodeError(
            this.contract.contractName
          );
        } else if (!this.constructorBinary.match(/^0x([0-9a-fA-F]{2})+$/)) {
          throw new UnlinkedContractError(
            this.contract.contractName,
            this.contract.bytecode
          );
        }
        //otherwise, we're good to go!
        const allocation =
          //@ts-ignore: We set this up and checked this earlier
          allocations.calldata.constructorAllocations[
            <string>this.constructorContextHash
          ].input;
        const inputs = allocation.arguments.map(
          input => ({ type: input.type, name: input.name || undefined }) //convert "" to undefined
        );
        return {
          selector: this.constructorBinary,
          inputs,
          abi
        };
      }
      case "function": {
        const selector: string = Codec.AbiData.Utils.abiSelector(abi);
        const allocation: Codec.AbiData.Allocate.CalldataAllocation =
          //@ts-ignore: This is set up earlier
          allocations.calldata.functionAllocations[this.deployedContextHash][
            selector
          ].input;
        const inputs = allocation.arguments.map(
          input => ({ type: input.type, name: input.name || undefined }) //convert "" to undefined
        );
        return {
          name: abi.name,
          selector,
          inputs,
          abi
        };
      }
    }
  }
}

/**
 * The ContractInstanceEncoder class.
 * Can encode transactions, resolve overloads, and wrap values.
 * Differs from the [[ContractEncoder]] only in that it carries
 * a `to` address for non-constructor transactions.
 * See below for a method listing.
 * @category Encoder
 */
export class ContractInstanceEncoder {
  private contractEncoder: ContractEncoder;
  private toAddress: string;

  /**
   * @protected
   */
  constructor(contractEncoder: ContractEncoder, toAddress: string) {
    this.contractEncoder = contractEncoder;
    if (!Web3Utils.isAddress(toAddress)) {
      throw new InvalidAddressError(toAddress);
    }
    this.toAddress = Web3Utils.toChecksumAddress(toAddress);
  }

  /**
   * See [[ProjectEncoder.wrapElementaryValue]].
   */
  public async wrapElementaryValue(
    dataType: Codec.Format.Types.ElementaryType,
    input: unknown
  ): Promise<Codec.Format.Values.ElementaryValue> {
    return await this.contractEncoder.wrapElementaryValue(dataType, input);
  }

  /**
   * See [[ProjectEncoder.wrap]].
   */
  public async wrap(
    dataType: Codec.Format.Types.Type,
    input: unknown
  ): Promise<Codec.Format.Values.Value> {
    return await this.contractEncoder.wrap(dataType, input);
  }

  /**
   * **This method is asynchronous.**
   *
   * This method functions identically to [[ContractEncoder.wrapForTransaction]],
   * except that, when preparing a function transaction, the `to` option is
   * automatically set to this contract instance's address.  If an explicit
   * `to` address is passed as a transaction option, it will be recognized
   * but ignored.
   */
  public async wrapForTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const resolution = await this.contractEncoder.wrapForTransaction(
      abi,
      inputs,
      options
    );
    if (!resolution.options.to && abi.type === "function") {
      resolution.options.to = this.toAddress;
    }
    return resolution;
  }

  /**
   * **This method is asynchronous.**
   *
   * This method functions identically to [[ContractEncoder.resolveAndWrap]],
   * except that the `to` option is automatically set to this contract
   * instance's address.  If an explicit `to` address is passed as a
   * transaction option, it will be recognized but ignored.
   */
  public async resolveAndWrap(
    abis: Abi.FunctionEntry[],
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const resolution = await this.contractEncoder.resolveAndWrap(
      abis,
      inputs,
      options
    );
    resolution.options.to = this.toAddress;
    return resolution;
  }

  /**
   * **This method is asynchronous.**
   *
   * This method functions identically to [[ContractEncoder.encodeTransaction]],
   * except that, when preparing a function transaction, the `to` option is
   * automatically set to this contract instance's address.  If an explicit
   * `to` address is passed as a transaction option, it will be recognized
   * but ignored.
   */
  public async encodeTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    const encoded = await this.contractEncoder.encodeTransaction(
      abi,
      inputs,
      options
    );
    //note that the to options is simply overridden
    //perhaps we can change this in the future, but for now we keep this
    //for compatibility
    if (abi.type === "function") {
      encoded.to = this.toAddress;
    } else if (abi.type === "constructor") {
      delete encoded.to;
    }
    return encoded;
  }

  /**
   * **This method is asynchronous.**
   *
   * This method functions identically to [[ContractEncoder.resolveAndEncode]],
   * except that the `to` option is automatically set to this contract
   * instance's address.  If an explicit `to` address is passed as a
   * transaction option, it will be recognized but ignored.
   */
  public async resolveAndEncode(
    abis: Abi.FunctionEntry[],
    inputs: unknown[],
    options: Types.ResolveOptions = {}
  ): Promise<Types.TxAndAbi> {
    const encoded = await this.contractEncoder.resolveAndEncode(
      abis,
      inputs,
      options
    );
    //note that the to options is simply overridden
    //perhaps we can change this in the future, but for now we keep this
    //for compatibility
    encoded.tx.to = this.toAddress;
    return encoded;
  }
}
