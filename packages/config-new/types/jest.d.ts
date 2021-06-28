import type * as t from "io-ts";

declare global {
  namespace jest {
    interface Matchers<R> { // eslint-disable-line @typescript-eslint/no-unused-vars
      toBeValid<T>(codec: t.Type<T>);
    }
  }
}

