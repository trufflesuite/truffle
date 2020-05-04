/**
 * # Truffle Codec
 *
 * This module provides low-level decoding and encoding functionality for
 * Solidity and the Solidity ABI.  Many parts of this module are intended
 * primarily for internal use by Truffle and so remain largely undocumented,
 * but some of its types are also output by @truffle/decoder, which provides
 * a higher-level interface to much of this module's functionality.
 *
 * ## If you're here from Truffle Decoder
 *
 * If you're coming here from [[@truffle/decoder]], you probably just want to
 * know about the parts that are relevant to you.  These are:
 *
 * * The "data" category (specifically [[Format]])
 * * The "output" and "enumerations" categories ([[CalldataDecoding]], [[LogDecoding]], et al., see below)
 * * The "errors" category (specifically [[UnknownUserDefinedTypeError]])
 *
 * Note that the data category is largely scarce in
 * documentation, although that's because it's largely self-explanatory.
 *
 * If you're not just here from Truffle Decoder, but are actually
 * interested in the lower-level workings, read on.
 *
 * ## How this module differs from Truffle Decoder
 *
 * Unlike Truffle Decoder, this library makes no network connections
 * and avoids dependencies that do.  Instead, its decoding functionality
 * is generator-based; calling one of the decoding functions returns a
 * generator.  This generator's `next()` function may return a finished
 * result, or it may return a request for more information.  It is up to
 * the caller to fulfill these requests -- say, by making a network
 * connection of its own.  This is how @truffle/decoder works; @truffle/codec
 * makes requests, and @truffle/decoder fulfills them by
 * looking up the necessary information on the blockchain.
 *
 * This library also provides additional functionality beyond what's used by
 * Truffle Decoder.  In particular, this library also exists to support Truffle
 * Debugger, and so it provides encoding functionality not just for
 * transactions, logs, and state variables, but also for Solidity variables
 * during transaction execution, including circularity detection for memroy
 * structures.  It includes functionality for decoding Solidity's internal
 * function pointers, which the debugger uses, but which Truffle Decoder
 * currently does not (although this is planned for the future).
 *
 * There is also functionality for decoding return values and revert messages
 * that goes beyond what's currently available in @truffle/decoder; this may get
 * a better interface in the future.
 *
 * ## How to use
 *
 * You should probably use [[@truffle/decoder]] instead, if your use case doesn't
 * preclude it.  This module has little documentation, where it has any at all,
 * and it's likely that parts of its interface may change (particularly
 * regarding allocation).  That said, if you truly need the functionality here,
 * Truffle Decoder can perhaps serve as something of a reference implementation
 * (and perhaps Truffle Debugger as well, though that code is much harder to
 * read or copy).
 *
 * @module @truffle/codec
 */ /** */

import "source-map-support/register";

//So, what shall codec export...?

//First: export the data format
import * as Format from "@truffle/codec/format";
export {
  /**
# Codec Output Format

## Module information

This module primarily defines TypeScript types for the output format
used in results provided by packages
`@truffle/decoder@^4.0.0` and `@truffle/codec@^0.1.0`.

See below for complete listing or continue reading
[Format information](#format-information) to learn about this format.

### How to import

Import either as part of Codec or by itself:

```typescript
// when importing entire Codec, use Codec.Format.*:
import * as Codec from "@truffle/codec";

// or import Format directly:
import { Format } from "@truffle/codec";
```

![Example struct decoding](media://example-struct-decoding.png)

## Format information

This format is intended for use in smart contract and dapp development
tools and libraries, and for use in display contexts, such as when
building on-screen components to show transaction and smart contract
state information.

This format seeks to provide an exhaustive schema for JavaScript
objects to encode **lossless**, **machine-readable** representations of
all possible Solidity and ABI data types and all possible values of those
types.

This format targets types and values understood by the
[Solidity programming language](https://solidity.readthedocs.io) and
the [Contract ABI specification](https://solidity.readthedocs.io/en/v0.5.3/abi-spec.html),
within the context of the [Ethereum Virtual Machine](https://ethereum.github.io/yellowpaper/paper.pdf)
(EVM) and in raw data for transactions and logs according to the
[Ethereum JSON RPC](https://github.com/ethereum/wiki/wiki/JSON-RPC).

Objects in this format may be deeply nested and/or contain circular
dependencies. As such, **do not** serialize objects in this format or
otherwise attempt to display them in full without considering potential
risk. **Objects in this format are for the machine to read, not humans!**
This module provides utilities for inspecting objects in this format,
including the **safe** [[Format.Utils.Inspect.ResultInspector]] wrapper
(for [util.inspect](https://nodejs.org/api/util.html#util_util_inspect_object_options)),
and the **unsafe** [[Format.Utils.Inspect.nativize]] function. For more
information, please see the documentation for those utilities.

### Specification

Individual decoded values are represented by objects of the type
[[Format.Values.Result]], which contain the following fields:
  1. `type`: This is a [[Format.Types.Type|`Type`]] object describing the value's
    type.  Each `Type` has a `typeClass` field describing the overall broad type,
    such as `"uint"` or `"bytes"`, together with additional information that gives
    the specific type.  For full detail, see [[Format.Types]].

  2. `kind`: This is either `"value"`, in which case the `Result` is a
    [[Format.Values.Value|`Value`]], or `"error"`, in which case the `Result` is an
    [[Format.Errors.ErrorResult|`ErrorResult`]].  In the former case, there will be
    a `value` field containin the decoded value.  In the latter case, there will be
    an `error` field indicating what went wrong.  *Warning*: When decoding a
    complex type, such as an array, mapping, or array, getting a kind of `"value"`
    does not necessarily mean the individual elements were decoded successfully.
    Even if the `Result` for the array (mapping, struct) as a whole has kind
    `"value"`, the elements might still have kind `"error"`.

  3. `value`: As mentioned, this is included when `kind` is equal to `"value"`.
    It contains information about the actual decoded value.  See
    [[Format.Values|`Format.Values`]] for more information.

  4. `error`: The alternative to `value`.  Generally includes information about
    the raw data that led to the error.  See [[Format.Errors|`Format.Errors`]] for
    more information.

  5. `reference`: This field is a debugger-only feature and does not
     apply to results returned by  @truffle/decoder, so it won't be documented here.

### Values vs. errors

It's worth taking a moment here to answer the question: What counts as a value,
and what counts as an error?

In general, the answer is that anything that can be generated via Solidity
alone (i.e. no assembly), with correctly-encoded inputs, and without making use
of compiler bugs, is a value, not an error.  That means that, for instance, the
following things are values, not errors:
  - A variable of contract type whose address does not actually hold a
    contract of that type;
  - An external function pointer that does not correspond to a valid
    function;
  - A string containing invalid UTF-8;
  - ..., etc.

By contrast, the following *are* errors:
  - A `bool` which is neither `false` (0) nor `true` (1);
  - An `enum` which is out of range;
  - ..., etc.

(You may be wondering about the enum case here, because if you go sufficiently
far back, to Solidity 0.4.4 or earlier, it *was* possible to generate
out-of-range enums without resorting to assembly or compiler bugs.  However,
enums are only supported in full mode (see
[Notes on decoding modes](../#decoding-modes)),
which only supports 0.4.12 and later, so
we consider out-of-range enums an error.  There are also additional technical
reasons why supporting out-of-range enums as a value would be difficult.)

There are three special cases here that are likely worthy of note.

Firstly, internal function pointers currently can't be meaningfully
decoded via @truffle/decoder.  However, they decode to a bare-bones value,
not an error, as it is (in a sense) our own fault that we can't decode
these, so it doesn't make sense to report an error, which would mean that
something is wrong with the encoded data itself.  This value that it
decodes to will give the program counter values it corresponds to, but
will not include the function name or defining class, as @truffle/decoder
is not presently capable of that.  For now, full decoding of internal
function pointers remains a debugger-only feature.  (But limited support for
this via @truffle/decoder is planned for the future.)

(When using the debugger, an invalid internal function pointer will decode to an
error.  However, when using @truffle/decoder, we have no way of discerning whether
the pointer is valid or not, so internal function pointers will always decode to
a value, if an uninformative one.)

Secondly, when decoding events, it is impossible to decode indexed parameters
of reference type.  Thus, these decode to an error
(`IndexedReferenceTypeError`, which see) rather than to a value.

Thirdly, the decoder is currently limited when it comes to decoding state
variables that are declared constant, and not all such variables are yet
supported in decoding; attempting to decode one of these that is not currently
supported will yield an error.

Similarly, there are various things that decode to errors for technical reasons.
Objects with encoded length fields larger than what fits in a JavaScript safe
integer, or pointed to by pointers with values larger than what fits in a
JavaScript safe integer, will decode to errors, even if they may technically be
legal.  Such cases are impractical to handle and should never come up in real
use so we decode them to errors.  Errors may also be returned in case of an
error in attempting to read the data to be decoded.

Finally, except when decoding events, we do not return an error if the pointers
in an ABI-encoded array or tuple are arranged in a nonstandard way, or if
strings or bytestrings are incorrectly padded, because it is not worth the
trouble to detect these conditions.


## Notes on this documentation

Most of this doesn't have explanatory documentation
because it's largely self-explanatory, but particularly
non-obvious parts have been documented for clarity.

A note on optional fields: A number of types or values
have optional fields.  These contain helpful
but non-essential information, or information which
for technical reasons we can't guarantee we can determine.

@category Data
   */
  Format
};

//now... various low-level stuff we want to export!
//the actual decoding functions and related errors
export {
  decodeVariable,
  decodeEvent,
  decodeCalldata,
  decodeReturndata,
  decodeRevert
} from "./core";
export { DecodingError, StopDecodingError } from "./errors";

//now: what types should we export? (other than the ones from ./format)
//public-facing types for the interface
export {
  DecodingMode,
  CalldataDecoding,
  LogDecoding,
  ReturndataDecoding,
  FunctionDecoding,
  ConstructorDecoding,
  MessageDecoding,
  UnknownCallDecoding,
  UnknownCreationDecoding,
  EventDecoding,
  AnonymousDecoding,
  ReturnDecoding,
  BytecodeDecoding,
  UnknownBytecodeDecoding,
  SelfDestructDecoding,
  RevertMessageDecoding,
  EmptyFailureDecoding,
  AbiArgument,
  DecoderRequest,
  StorageRequest,
  CodeRequest
} from "./types";
export * from "./common";

export { abifyCalldataDecoding, abifyLogDecoding } from "./abify";

// data locations - common
import * as Basic from "./basic";
import * as Bytes from "./bytes";
export {
  /**
   * For decoding of primitives and constants
   *
   * @protected
   */
  Basic,
  //Category: Common data location
  //[NOT making this an actual category for now
  //since there's nothing public in it]
  /**
   * Contains functions for dealing with raw bytestrings
   * @protected
   */
  Bytes
  //Category: Common data location
  //[NOT making this an actual category for now
  //since there's nothing public in it]
};

// data locations - abi
import * as AbiData from "./abi-data";
import * as Topic from "./topic";
export {
  /**
   * For allocation, encoding, and decoding of locations related to the ABI
   * (calldata in Solidity, events, etc.)
   *
   * @category ABI data location
   */
  AbiData,
  /**
   * For decoding of event topics
   *
   * @protected
   * @category ABI data location
   */
  Topic
};

// data locations - solidity
import * as MappingKey from "./mapping-key";
import * as Memory from "./memory";
import * as Special from "./special";
import * as Stack from "./stack";
import * as Storage from "./storage";
import * as AstConstant from "./ast-constant";

export {
  /**
   * For encoding mapping keys
   *
   * @protected
   * @category Solidity data location
   */
  MappingKey,
  /**
   * For allocation and decoding of memory data
   *
   * @category Solidity data location
   */
  Memory,
  /**
   * For decoding of special/magic variables
   *
   * @protected
   * @category Solidity data location
   */
  Special,
  /**
   * For decoding stack variables
   *
   * @category Solidity data location
   */
  Stack,
  /**
   * For allocation and decoding of storage variables
   *
   * @category Solidity data location
   */
  Storage,
  /**
   * For reading/decoding constants expressed as AST nodes
   *
   * @category Solidity data location
   */
  AstConstant
};

import * as Ast from "./ast";
export { Ast };

import * as Compiler from "./compiler";
export { Compiler };

import * as Compilations from "./compilations";
export { Compilations };

import * as Contexts from "./contexts";
export { Contexts };

import * as Conversion from "./conversion";
export { Conversion };

import * as Pointer from "./pointer";
export { Pointer };

import * as Evm from "./evm";
export { Evm };
