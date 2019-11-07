# Truffle Codec

This module, `@truffle/codec`, provides an interface for decoding Solidity
smart contract state as well as information sent to or from smart contracts
using the Solidity ABI.  It produces output in a machine-readable form that
avoids losing any information.  It also has some rudimentary encoding
functionality, that will be expanded in the future.  This module is also
what Truffle Debugger uses for its decoding.

This is a low-level module, and it's probable that you should use the
higher-level interface [Truffle Decoder](../decoder/) instead.  That said, if
for whatever reason Truffle Decoder will not suffice for your use case, it's
possible that you may need to use this.

## Install

```
$ npm install --save @truffle/codec
```

This module does not provide a CLI; it is entirely meant to be used as part
of a larger JavaScript or TypeScript program.

## Usage and Documentation

This module has some [API
documentation](https://www.trufflesuite.com/docs/truffle/codec/index.html),
which you should see for further usage information.  Note that as this is a
low-level module mostly intended for internal Truffle use, its documentation is
sparse at the moment.

## License

As part of the larger [Truffle Suite](https://github.com/trufflesuite/truffle/),
this module is MIT-licensed.
