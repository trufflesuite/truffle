# `@truffle/webpack-test-helper`

This library makes it possible to import webpack-bundled modules that haven't
been explicitly exported.

## Usage

If you'd prefer to just read code, just go have a look at the tests. They're
written as a design spec, and should illustrate the functionality of this
package nicely.

### Webpack Config

At a minimum, ensure that the following `optimization` settings are present in your config:

```javascript
optimization: {
  chunkId: "named",
  moduleId: "named",
  runtimeChunk: "single"
}
```

Note that these settings are already applied to all truffle webpack configs in `webpack/webpack.config.base.ts`.

### Constructing WebpackTestHelper

```ts
import { WebpackTestHelper } from "@truffle/webpack-test-helper";

// resolves the bundle from the `main` entry in the `package.json` of the given module name
const helper = new WebpackTestHelper("@truffle/package-name-here");
```

### Requiring a bundled dependency

```ts
// grab the type for the module that you're importing
import type { Debug } from "debug";

// construct a helper (or reuse an existing one for the bundle in question)
const helper = new WebpackTestHelper("@truffle/package-name-here");

// just use it like you'd use a generically-typed `require` function.
const debugModule = helper.require<Debug>("debug");
```

### Requiring a bundled internal module

```ts
// grab the type for the module that you're importing
import type myModuleType from "../src/myModule";

// construct a helper (or reuse an existing one for the bundle in question)
const helper = new WebpackTestHelper("@truffle/package-name-here");

// This works similarly to the case where you want a bundled dependency, except
// that you need to use the path of the built module (including file
// extension), relative to the root of the package for that module. Note that
// it must also use forward slashes as a path separator, and begin with "./" to
// indicate a relative path.
const helper = helper.require<myModuleType>("./build/myModule.js");
```

### Mocking/stubbing

Mostly works as normal, just make sure to use the `helper.require` instead of the
built-in `import` or `require` keywords.

Just bear in mind that there's no way to access the bundle's internal module
cache, so this helper won't work in cases where you'd like to stub a module
that exports a function (e.g. the `debug` module). In those cases you'll want
to make use of dependency injection (aka inversion of control) to make it
possible to inject a stubbed/mocked module rather than attempting to stub the
module in place in the module cache.

It's possible that we could change this in the future, but doing so would
involve writing a webpack plugin that exposes the `__webpack_module_cache__` as
part of the webpack runtime export.
