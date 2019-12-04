# Truffle Decoding and Encoding

This documentation provides information and complete interface listings for
two packages: **@truffle/decoder**, a high-level library for decoding, and
**@truffle/codec**, a low-level package for encoding, decoding, and data
representation.


## Contents

### High-level interface (for common use)

[[@truffle/decoder]] provides a high-level interface for **decoding
transactions, events, and state variables for Ethereum smart contracts.**
This package accepts Truffle's
[contract abstractions](https://www.trufflesuite.com/docs/truffle/reference/contract-abstractions)
as input (or Truffle's artifact files and a provider) and connects to the
blockchain to retrieve raw values for decoding.

### Low-level interface (for special-case purposes)

[[@truffle/codec]] provides the underlying low-level interfaces for performing
this decoding, as well as interfaces for encoding these values and for
decoding of local Solidity variables and other
data observable in a debugging trace.

This library is meant to be **self-contained**, makes **no network connections** of its
own, and **seeks to restrict its dependencies** to those which provide data
structures for high-precision numbers and other special-purpose data utilities.

_Although most use cases will not require invoking the codec directly, a
few key parts of this library are directly relevant to decoder use. See
notes below._

## ℹ️ Important notes

### Output format

Both the decoder and the codec return results as objects containing both type
information and either high-precision values or accurate errors in place of
values. We recommend familiarizing yourself with the [[Format]] documentation
in order to use these packages.

### Decoding modes

The decoder operates in either of two modes:
  1. Full mode (`"decodingMode": "full"`), which uses source code information
     to return types and values to match the original Solidity.
  2. ABI mode (`"decodingMode": "abi"`), which uses only information from the
     contract ABI and returns less information, e.g. returning
     [[Format.Values.UintResult|`UintResult`]]s in place of
     [[Format.Values.EnumResult|`EnumResult`]]s
     and [[Format.Values.AddressResult|`AddressResult`]]s istead of
     [[Format.Values.ContractResult|`ContractResult`]]s

By default, the decoder uses **full mode**, but for technical reasons, this may
not be reliable. If decoding fails in full mode, it **falls back to ABI mode.**

Returned decodings (i.e. [[CalldataDecoding]] and [[LogDecoding]]) indicate
which mode was used via the `"decodingMode"` field.

To ensure full mode works, use Solidity v0.4.12 or higher and compile all your
contracts at the same time.

If you can't use full mode or don't want to deal with the distinction,
the decoder provides
[[WireDecoder.abifyCalldataDecoding|`decoder.abifyCalldataDecoding`]]
and [[WireDecoder.abifyLogDecoding|`decoder.abifyLogDecoding`]] methods,
which accept decodings in either mode and always return ABI mode.

#### Additional notes on decoding modes

- Full mode may reject certain decodings (e.g. out of range enums) that are
  fine in ABI mode.

- ABI-fied full mode decodings may contain extra information that regular ABI
  mode results do not.

- Decoding mode applies to the entire decoding, but objects that contain
  multiple decodings (e.g. [[DecodedLog]]) may contain decodings in different
  modes.

- You can only decode storage variables in full mode. If full mode fails
  while decoding a storage variable, it will throw an exception.

---

<p align="center">
⚡
</p>

---
