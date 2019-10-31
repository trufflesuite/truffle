# Truffle Decoding and Encoding

This documentation provides information and complete interface listings for
two packages: **@truffle/decoder**, a high-level library for decoding, and
**@truffle/codec**, a low-level pacakge for encoding, decoding, and data
representation.

## Contents

### High-level interface (for common use)

[[@truffle/decoder]] provides a high-level interface for **decoding
transactions, events, and state variables for Ethereum smart contracts.**
This package accepts Truffle
[contract abstractions](https://www.trufflesuite.com/docs/truffle/reference/contract-abstractions)
as input (or Truffle's artifact files + provider) and connects to the
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
few key parts of this library are directly relevant to decoder use._

#### Codec.Format

Both the decoder and the codec return results as objects containing both type
information and either high-precision values or accurate errors in place of
values. We recommend familiarizing yourself with the [[Format]] documentation
in order to use these packages.

