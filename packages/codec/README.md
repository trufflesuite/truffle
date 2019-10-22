# Truffle Decoder

This module provides an interface for decoding contract state, transaction
calldata, and events.  It's an interface to the same low-level decoding
functionality that Truffle Debugger uses.  However, it has additional
functionality that the debugger does not need, and the debugger has additional
functionality that this interface either does not need or cannot currently
replicated.  In the future, this interface will also decode return values and
revert strings.

The interface is split into three classes: The wire decoder, the contract
decoder, and the contract instance decoder.  The wire decoder is associated to
the project as a whole and decodes transaction calldata and events.  The
contract decoder is associated to a specific contract class.  It has all the
capabilities of the wire decoder, but in addition it acts as a factory for
contract instance decoders.  The contract instance decoder is associated to a
specific contract instance; it too has all the capabilities of the wire decoder,
but it can also decode the state variables for the specific instance.  (In
addition, in the case that the contract does not include a `deployedBytecode`
field in its artifact, which can hinder decoding certain things, the contract
instance decoder can sometimes work around this where the other decoders
cannot.)

This documentation describes the current state of the decoder, but you should
expect to see improvements soon.  Note that most of the documentation is not
found in this README, but rather in this package's API documentation.  However,
this README describes the overall approach.

## Usage

### Initialization

Create a decoder with one of the following functions:
* [[forProject|`forProject`]]
* [[forContract|`forContract`]]
* [[forContractWithDecoder|`forContractWithDecoder`]]
* [[forContractInstance|`forContractInstance`]]

See the API documentation of these functions for details, or below for usage
examples.

### Methods

See the documentation for the individual decoder classes for a method listing.

### Decoding modes and abification

The decoder can operate in either of two modes: Full mode or ABI mode.  In ABI
mode, it decodes purely based on the information in the ABI.  In full mode, it
uses Solidity AST information to provide a more detailed decoding.  Due to
various technical reasons, full mode is not always reliably available.  The only
way to guarantee the use of full mode is if all your contracts are written in
Solidity (version 0.4.9 or later) and they were all compiled simultaneously.

The decoder will always run in full mode when possible, but sometimes the
necessary information may be missing or, for technical reasons, unusable.  In
this case, it will fall back into ABI mode.  Decodings are always marked with
which mode produced them so you can distinguish, as the format of a result may
differ substantially due to which mode was used.  Full mode is only available
for Solidity contracts and only for Solidity versions 0.4.9 or later; ABI mode
works with anything using the Solidity ABI.

If you want to simplify matters and to not have to deal with this distinction,
the decoder provides methods for converting a given decoding to ABI mode.  So
you can run the decoder in whatever mode it runs in, then run the result through
these methods to ensure you get an ABI mode result.  As noted above, there's
no way to ensure you get a full mode result.

(There are two slight differences between running the decoder in full mode and
abifying afterward, versus simply running the decoder in ABI mode.  Firstly,
full mode will reject certain invalid decodings that ABI mode cannot recognize
as invalid.  Secondly, the abified version of a full-mode decoding does contain
slightly more information than an actual ABI-mode decoding, just in an
ABI-mode-compatible format.)

Note that modes are always applied at the level of the whole decoding; different
variables in the same decoding will always be decoded with the same mode.
However, if an object (such as a log) admits *multiple* decodings, these
different decodings may occur in different modes.

Note that decoding of state variables is only available in full mode; attempting
to decode state variables will result in an exception if full mode is not
possible.

### Output format: `Type`s and `Result`s

This will be a brief explanation of the format of decoded variables.  For full
detail, see the API documentation for [[Format|`Format`]].

Each decoded value is a [[Format.Values.Result|`Result`]].  A `Result` has the
following fields:

1. `type`: This is a [[Format.Types.Type|`Type`]] object describing the value's
type.  Each `Type` has a `typeClass` field describing the overall broad type,
such as `"uint"` or `"bytes"`, together with additional information that gives
the specific type.  For full detail, see `Format.Types` to see how these work.

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
[[Format.Values|`FOrmat.Values`]] for more information.

4. `error`: The alternative to `value`.  Generally includes information about
the raw data that led to the error.  See [[Format.Errors|`Format.Errors`]] for
more information.

5. `reference`: This field is a debugger-only feature and won't come up when
using this interface, so it won't be documented here.

#### Values vs errors
 
It's worth taking a moment here to answer the question: What counts as a value,
and what counts as an error?

In general, the answer is that anything that can be generated via Solidity
alone (i.e. no assembly), with correctly-encoded inputs, and without making use
of compiler bugs, is a value, not an error.  That means that, for instance, the
following things are values, not errors:

* A variable of contract type whose address does not actually hold a contract
of that type;

* An external function pointer that does not correspond to a valid function;

* A string containing invalid UTF-8;

etc.

By contrast, the following *are* errors:

* A `bool` which is neither `false` (0) nor `true` (1);

* An `enum` which is out of range;

etc.

(You may be wondering about the enum case here, because if you go sufficiently
far back, to Solidity 0.4.4 or earlier, it *was* possible to generate
out-of-range enums without resorting to assembly or compiler bugs.  However,
enums are only supported in full mode, which only supports 0.4.9 and later, so
we consider out-of-range enums an error.  There are also additional technical
reasons why supporting out-of-range enums as a value would be difficult.)

There are three special cases here that are likely worthy of note.

Firstly, internal function pointers currently can't be meaningfully decoded via
this interface.  However, they decode to a bare-bones value, not an error, as it
is (in a sense) our own fault that we can't decode these, so it doesn't make
sense to report an error, which would mean that something is wrong with the
encoded data itself.  This value that it decodes to will give the program
counter values it corresponds to, but will not include the function name or
defining class, as this interface is not presently capable of that.  For now,
full decoding of internal function pointers remains a debugger-only feature.

(When using the debugger, an invalid internal function pointer will decode to an
error.  However, when using this interface, we have no way of discerning whether
the pointer is valid or not, so internal function pointers will always decode to
a value, if an uninformative one.)

Secondly, when decoding events, it is impossible to decode indexed parameters
of reference type.  Thus, these decode to an error
(`IndexedReferenceTypeError`, which see) rather than to a value.

Finally, except when decoding events, we do not return an error if the pointers
in an ABI-encoded array or tuple are arranged in a nonstandard way, or if
strings or bytestrings are incorrectly padded, because it is not worth the
trouble to detect these conditions.

### Usage examples


