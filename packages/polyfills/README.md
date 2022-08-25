# @truffle/polyfills

Contains all polyfills used by the Truffle CLI and packages in the `@truffle` namespace.

## Usage

Unfortunately TypeScript doesn't propagate global type changes unless you
directly import a package that modifies a global type. As a result of this
limitation, and to keep better track of which polyfills are used by which
packages, this package requires consumers to import the specific polyfill
module(s) that they need as submodule imports.

Like most polyfill modules, these submodule imports will directly modify the
relevant global types and related builtin implementation of the feature being
polyfilled.

### Example

```typescript
import "@truffle/polyfills/errorCause";

throw new Error("This is an error with _conviction_.", {
  cause: "Whatever gets the most retweets"
});
```

### Applying all polyfills

This package borrows ans idea from the [es-shim-api multi-shim
package](https://github.com/es-shims/es-shim-api#multi-shim-packages) spec in
that the default and only export from the package entrypoint is an array of
names of submodules that can be imported to shim APIs.

Because of this, you can programatically apply all polyfills supported by this
package in a mannor similar to the following. **Note: this should only be done
if strictly necessary, such as when collecting polyfills to bundle, and
otherwise use of this pattern is _strongly_ discouraged.**

```typescript
import polyfillNames from "@truffle/polyfills";

for (const polyfillName of polyfillNames) {
  require(`@truffle/polyfills/${polyfillName}`);
}
```

## Determining whether a polyfill should be applied

In short, don't. The polyfill submodules generally check whether a polyfill
exists in your environment already, and module caching ensures that a given
polyfill is never applied twice.

## Adding polyfills to this package

1. Make sure that every polyfill module added to this package is commented with
   details about the node and ES versions that introduce the feature. Without this
   information it becomes quite cumbersome to know which polyfills can be removed
   as we drop support for older LTS node versions and similar.
2. Make sure that you add the polyfill name to the array that is exported from
   `lib/index.ts`
