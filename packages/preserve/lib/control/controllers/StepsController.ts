import {
  ErrorController,
  ConstructorOptions as ErrorControllerConstructorOptions,
  IErrorController
} from "./ErrorController";
import { Events } from "../events";
import {
  IValueResolutionController,
  ValueResolutionController
} from "./ValueResolutionController";
import { Process, State } from "../types";

export namespace Options {
  export interface Begin {
    message?: string;
  }

  export interface Log {
    message: string;
  }

  export interface Succeed {
    result?: any;
    message?: string;
  }

  export interface Declare {
    identifier: string;
    message?: string;
  }

  export interface Step {
    identifier?: string;
    message?: string;
  }
}

export interface ConstructorOptions extends ErrorControllerConstructorOptions {}

export interface IStepsController extends IErrorController {
  begin(options?: Options.Begin): Process<void, Events.Begin>;
  log(options: Options.Log): Process<void, Events.Log>;
  succeed(options?: Options.Succeed): Process<void, Events.Succeed>;
  declare(
    options: Options.Declare
  ): Process<IValueResolutionController, Events.Declare>;
  step(options: Options.Step): Process<IStepsController, Events.Step>;
}

export class StepsController
  extends ErrorController
  implements IStepsController {
  constructor(options: ConstructorOptions) {
    const { ...superOptions } = options;
    super(superOptions);

    // so we can pass these around as functions
    this.begin = this.begin.bind(this);
    this.succeed = this.succeed.bind(this);
    this.log = this.log.bind(this);
    this.declare = this.declare.bind(this);
    this.step = this.step.bind(this);
  }

  async *begin() {
    // can only begin not begun yet
    if (this._state !== State.Pending) {
      return;
    }

    yield this.emit<Events.Begin>({
      type: "begin"
    });

    this._state = State.Active;
  }

  async *succeed({ result, message }: Options.Succeed = {}) {
    // only meaningful to succeed if we're currently active
    if (this._state !== State.Active) {
      return;
    }

    yield this.emit<Events.Succeed>({
      type: "succeed",
      result,
      message
    });

    this._state = State.Done;
  }

  async *log({ message }: Options.Log) {
    yield this.emit<Events.Log>({
      type: "log",
      message
    });
  }

  async *declare({ identifier, message }: Options.Declare) {
    const parent = this;

    const child = new ValueResolutionController({
      scope: [...this.scope, identifier],
      parent,
      state: State.Active
    });

    this.children.push(child);

    yield child.emit<Events.Declare>({
      type: "declare",
      message: message || identifier
    });

    return child;
  }

  async *step({ identifier, message }: Options.Step) {
    const parent = this;

    const child = new StepsController({
      scope: [...this.scope, identifier || message],
      parent,
      state: State.Active
    });

    this.children.push(child);

    yield child.emit<Events.Step>({
      type: "step",
      message: message || identifier
    });

    return child;
  }
}
