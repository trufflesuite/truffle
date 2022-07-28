import { EOL } from "os";

/**
 * Options for the `TruffleError` class. Follows the interface of the
 * `ErrorOptions` type introduced in node@16.9.0 and ratified as part of the
 * ES2022 spec.
 */
export interface ErrorOptions {
  /**
   * The underlying cause of the error. Most often this is a `Error` object, but
   * per the ES2022 spec, it can be any type of object.
   */
  cause?: any;
}

export class TruffleError extends Error {
  private _cause: any;
  private _originalStack: string | undefined;

  get cause(): any {
    return this._cause;
  }

  /**
   * @param message The error message.
   * @param options The options for the error.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    // This is necessary because we are extending the build-in Error class.
    // Without this line, the `instanceof` operator does not work correctly.
    // This must also be done in classes that extend TruffleError.
    // Object.setPrototypeOf(this, TruffleError.prototype);

    this.name = this.constructor.name;
    this._cause = options?.cause;

    this._originalStack = this.stack;

    // we define the stack property here using Object.defineProperties instead
    // of with the TypeScript get/set property syntax because the latter gets overwritten
    Object.defineProperties(this, {
      stack: {
        get: this._getCombinedTrace,

        // The solidity stack tracing feature mutates an error's `stack`
        // property, so we retain that capability here. Note that if there's a
        // `cause` present, we will still include the cause's stack in the
        // combined stack output
        set: this._setTrace
      }
    });
  }

  private _setTrace(value: string) {
    this._originalStack = value;
  }

  private _getCombinedTrace() {
    const stacks = [this._originalStack];

    for (let cause = this.cause; cause; cause = cause.cause) {
      if (cause instanceof TruffleError) {
        stacks.push(`Caused by: ${cause._originalStack}`);
      } else {
        stacks.push(`Caused by: ${cause.stack}`);
      }
    }

    return stacks.join(EOL);
  }
}

export default TruffleError;
