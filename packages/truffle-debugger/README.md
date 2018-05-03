# truffle-debugger

Portable Solidity debugger library, for use with or without Truffle.

![Debugger in Action](https://i.imgur.com/0j5m4KW.gif)

Features:
- Solidity stepping and breakpoints
- Variable inspection
- Watch expressions
- and more!

## API Documentation

API Documentation for this library can be found at [truffleframework.com/truffle-debugger](http://truffleframework.com/truffle-debugger/).

## Library Usage

_:warning: This documentation is currently a work in progress.
Please see the [reference integration](https://github.com/trufflesuite/truffle-core/blob/develop/lib/commands/debug.js) provided by the `truffle debug` command._

### Required Parameters

To start a truffle-debugger session, you'll need the following:

- `txHash` - A transaction hash (prefixed with `0x`), for the transaction to debug
- `provider` - A web3 provider instance (see [web3.js](https://github.com/ethereum/web3.js/))
- `contracts` -  An array of contract objects, with the following properties:
  - `contractName` - The name of the contract
  - `source` - The full Solidity source code
  - `sourcePath` - (optional) the path to the Solidity file on disk
  - `ast` - The Solidity compiler's output AST (new style, not `legacyAST`)
  - `binary` - `0x`-prefixed string with the binary used to create a contract instance
  - `sourceMap` - The Solidity compiler output source map for the creation binary
  - `deployedBinary` - `0x`-prefixed string with the on-chain binary for a contract instance
  - `deployedSourceMap` - The source map corresponding to the on-chain binary (from the Solidity compiler)

### Invocation

1. Start the debugger session by constructing a Debugger instance with `.forTx()` and then `.connect()` to it:

```javascript
import Debugger from "truffle-debugger";

let session = Debugger
  .forTx(txHash, { contracts, provider })
  .connect();
```

2. Resolve the session's `ready()` promise:

```javascript
await session.ready();
```

3. Use the provided public methods on the `session` instance in order to step through the trace for the transaction:

```javascript
session.stepNext();
session.stepOver();
session.stepInfo();
```

4. Access data provided by the debugger via the `session.view()` interface, and the provided selectors:

```javascript
let { ast, data, evm, solidity, trace } = Debugger.selectors;

let variables = session.view(data.identifiers.native.current);
let sourceRange = session.view(solidity.current.sourceRange);
```

### Useful API Docs References

- [**`Session` class docs**](http://truffleframework.com/truffle-debugger/class/lib/session/index.js~Session.html)
- **Docs for selectors:**
  - [**`ast` selectors**](http://truffleframework.com/truffle-debugger/identifiers.html#ast-selectors)
  - [**`data` selectors**](http://truffleframework.com/truffle-debugger/identifiers.html#data-selectors)
  - [**`evm` selectors**](http://truffleframework.com/truffle-debugger/identifiers.html#evm-selectors)
  - [**`solidity` selectors**](http://truffleframework.com/truffle-debugger/identifiers.html#solidity-selectors)
  - [**`trace` selectors**](http://truffleframework.com/truffle-debugger/identifiers.html#trace-selectors)

## Contributing

It's our goal that this library should serve as a reliable and well-maintained tool for the Solidity ecosystem. Ultimately, we hope to support all language features and meet the varied requirements of a mature debugging library.

We believe that a good Solidity debugger belongs to the community. We welcome, with our most humble gratitude, any and all community efforts in bringing this debugger closer to that goal. If you find something broken or missing, please open an issue!

Some other ideas for how to get involved:
- Bug fix PRs
- Documentation improvements
- Additional tests - unit tests and integration
- Technical discussion (ways to improve architecture, etc.)

Thank you for all the continued support. :bow:
