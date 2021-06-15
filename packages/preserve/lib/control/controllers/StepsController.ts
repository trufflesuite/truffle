import {
  ErrorController,
  ConstructorOptions as ErrorControllerConstructorOptions,
  IErrorController
} from "./ErrorController";
import type { Events } from "../events";
import {
  IValueResolutionController,
  ValueResolutionController
} from "./ValueResolutionController";
import { Process, State } from "../types";
import { transitionToState, validStates } from "./decorators";

export namespace Options {
  export interface Begin {
    message?: string;
  }

  export interface Update {
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
  update(options: Options.Update): Process<void, Events.Update>;
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
    this.update = this.update.bind(this);
    this.declare = this.declare.bind(this);
    this.step = this.step.bind(this);
  }

  @validStates([State.Pending])
  @transitionToState(State.Active)
  async *begin() {
    yield this.emit<Events.Begin>({
      type: "begin"
    });
  }

  @validStates([State.Active])
  @transitionToState(State.Done)
  async *succeed({ result, message }: Options.Succeed = {}) {
    yield this.emit<Events.Succeed>({
      type: "succeed",
      result,
      message
    });
  }

  @validStates([State.Active])
  async *update({ message }: Options.Update) {
    yield this.emit<Events.Update>({
      type: "update",
      message
    });
  }

  @validStates([State.Active])
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

  @validStates([State.Active])
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
