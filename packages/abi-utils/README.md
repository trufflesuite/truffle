# `@truffle/abi-utils`

Contains a few utilities for dealing with ABIs.

## Contents

This package contains a few different components:

- [Normalize ABIs](#normalize-abis)
- [TypeScript types](#typescript-types)
- [Arbitrary random ABIs](#arbitrary-random-abis)

## Normalize ABIs

> ```typescript
> // handle function entries omitting "type" from JSON
> const isFunctionEntry = entry.type === "function" || !("type" in entry);
>
> // handle:        v--- new way                           v--- old way     v--- default
> const isPayable = entry.stateMutability === "payable" || entry.payable || false;
>
> // handle "outputs" possibly being undefined
> const outputs = entry.outputs || [];
> ```
_^ Have you ever had to do this sort of thing?_ :scream:

Solidity's official [JSON ABI specification](https://solidity.readthedocs.io/en/v0.7.3/abi-spec.html)
is rather permissive, since it remains backwards compatible with older
versions of the language and because it permits omitting fields with default
values. This can get annoying if you're programmatically processing ABIs.

:information_source: This package provides a `normalize` function to purge
these kinds of inconsistencies.

```javascript
const { normalize } = require("@truffle/abi-utils");
```

```typescript
import { normalize } from "@truffle/abi-utils";
```

Specifically, this normalizes by:
- Ensuring every ABI entry has a `type` field, since it's optional for
  `type: "function"`
- Populating default value `[]` for function `outputs` field
- Removing all instances of the legacy `payable` and `constant` fields
- Replacing those two fields with the newer `stateMutability` field

To use, provide the ABI as a JavaScript array, as the sole argument to the
function:

```typescript
// accepts ABIs from Solidity versions back to 0.4.12 or earlier!
const abi = normalize([{"type": "constructor"/*, ...*/}/*, ...*/);

// don't even worry about it
const isFunctionEntry = entry.type === "function";
const isPayable = entry.stateMutability === "payable";
```


## TypeScript types

This package exports the following types for **normalized** ABIs.

- `Abi`, to represent the full ABI array
- `Entry`, to represent items in ABI arrays
- `FunctionEntry`, to represent named functions
- `ConstructorEntry`, to represent constructors
- `FallbackEntry`, to represent old or new fallback functions
- `ReceiveEntry`, to represent receive functions
- `Parameter`, to represent parameters defined in entry inputs or outputs
- `EventParameter`, to represent event parameters

To use these, you should first call [`normalize`](#normalize-abis), described
above.

```typescript
import * as Abi from "@truffle/abi-utils";

const abi: Abi.Abi = [{"type": "constructor"/*, ...*/}/*, ...*/];
const parameter: Abi.Parameter = {"type": "tuple[]", "components": [/*...*/]};
// etc.
```


## Arbitrary random ABIs

_Do you need to test all the different kinds of ABIs, including testing your
support for the various quirks across different Solidity versions?_ :flushed:

You can use this package for generating all sorts of random ABIs, random ABI
events, random ABI parameter values, etc.

This package provides [fast-check](https://github.com/dubzzz/fast-check)
arbitraries for property-based testing methodologies. If you're not familiar
with fast-check or property-based testing, please see the link above for more
information.

```typescript
import * as fc from "fast-check";
import { Arbitrary } from "@truffle/abi-utils";

// generate 10 random ABIs
const randomAbis = fc.sample(Arbitrary.Abi(), 10);
```

See this package's [internal tests for `normalize`](./lib/normalize.test.ts)
for example usage in automated tests.
