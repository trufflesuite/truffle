import type { Events } from "../events";
import { Process, State } from "../types";
import {
  BaseController,
  ConstructorOptions as BaseConstructorOptions,
  IBaseController
} from "./BaseController";
import { transitionToState, validStates } from "./decorators";

export namespace Options {
  export interface Fail {
    cascade?: boolean;
    error?: Error;
  }

  export interface Abort {
    cascade?: boolean;
  }

  export interface Stop {}
}

export interface ConstructorOptions extends BaseConstructorOptions {
  parent?: IErrorController;
}

export interface IErrorController extends IBaseController {
  fail(
    options: Options.Fail
  ): Process<void, Events.Fail | Events.Abort | Events.Stop>;
  abort(options: Options.Abort): Process<void, Events.Abort | Events.Stop>;
  stop(options?: Options.Stop): Process<void, Events.Stop>;
}

export abstract class ErrorController
  extends BaseController
  implements IErrorController {
  protected parent?: IErrorController;
  protected children: IErrorController[];

  constructor(options: ConstructorOptions) {
    const { parent, ...superOptions } = options;

    super(superOptions);

    this.children = [];
    if (parent) {
      this.parent = parent;
    }

    // so we can pass these around as functions
    this.fail = this.fail.bind(this);
    this.abort = this.abort.bind(this);
    this.stop = this.stop.bind(this);
  }

  @validStates([State.Active])
  async *fail({ error, cascade = true }: Options.Fail = {}) {
    // stop all children
    for (const child of this.children) {
      yield* child.stop();
    }

    yield this.emit<Events.Fail>({
      type: "fail",
      error
    });

    this._state = State.Error;

    // propagate to parent
    if (this.parent && cascade) {
      yield* this.parent.abort({ cascade });
    }
  }

  @validStates([State.Active])
  async *abort({ cascade = true }: Options.Abort = {}) {
    // stop all children
    for (const child of this.children) {
      yield* child.stop();
    }

    yield this.emit<Events.Abort>({
      type: "abort"
    });

    this._state = State.Error;

    // propagate to parent
    if (this.parent && cascade) {
      yield* this.parent.abort({ cascade });
    }
  }

  @validStates([State.Active])
  @transitionToState(State.Error)
  async *stop({}: Options.Stop = {}) {
    // stop all children
    for (const child of this.children) {
      yield* child.stop();
    }

    yield this.emit<Events.Stop>({
      type: "stop"
    });
  }
}
