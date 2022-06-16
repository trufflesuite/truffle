# `@truffle/promise-tracker`

This library is used for keeping track of asynchronous work that needs to complete prior to the process exiting.

## Usage

**IMPORTANT** Only use this library as a last resort. Typically you're better off architecting things so that you don't need process-level tracking of outstanding tasks.

Some alternatives to consider before using this module:

- Wherever possible, only make asynchronous calls from within an asynchronous
  context (aka, avoid using `.then` and `.catch` callbacks).
- Implement timeouts for long-running processes using `Promise.race`
- Unref any best-effort/speculative timers
  ([immediate](https://nodejs.org/api/timers.html#immediateunref),
  [timeout](https://nodejs.org/api/timers.html#timeoutunref) to prevent them
  from keeping your process alive when everything else is done

### Tracking asynchronous operations

For the moment promise tracking is implemented as a method decorator, meaning it
_must_ be applied to method declaration on a class.

It can be applied to any method, and it will only add special handling when methods return promises

```ts
import { tracked } from "@truffle/promise-tracker";

class Foo {
  // totally fine, even though it doesn't return a promise
  @tracked
  synchronousBar(): "-" {
    return "-";
  }

  @tracked
  async asyncBar(): Promise<"-"> {
    return "-";
  }

  // this works the same as with `asyncBar`, even though it's not explicitly an
  // async method
  @tracked
  promiseBar(): Promise<"-"> {
    return new Promise<"-">(resolve => resolve("-"));
  }
}
```

### Waiting for tracked operations to complete (async)

```ts
import { waitForOutstandingPromises } from "@truffle/promiseTracker";

let exitCode = 0;

// If no catchHandler is passed, rejected promises are handled silently.
// This is because these promise rejections should already be handled by the
// caller that created the promise.
await waitForOutstandingPromises({ catchHandler: () => (exitCode = 1) });
process.exit(exitCode);
```

### Waiting for tracked operations to complete (synchronous)

```ts
import { waitForOutstandingPromises } from "@truffle/promiseTracker";

let exitCode = 0;

// If no catchHandler is passed, rejected promises are handled silently.
// This is because these promise rejections should already be handled by the
// caller that created the promise.
waitForOutstandingPromises({ catchHandler: () => (exitCode = 1) }).then(() => {
  process.exit(exitCode);
});
```
