# Truffle Decoder
This module provides interfaces for decoding Solidity variables.  This is a
fairly low-level interface meant to be used by e.g. a debugger; for a
higher-level interface, see the `truffle-contract-decoder` package instead.

## Usage
```
import { forEvmState } from 'truffle-decoder';

const decoder = forEvmState(definition, pointer, info);
```

The variable `decoder` will then contain a generator you can use to decode your
variable.  It may make requests for storage or for code; responses should be in
the form of a `Uint8Array`.
