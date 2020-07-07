export type Scope = string[];

export namespace Scopes {
  const separator = "␟"; // ASCII delimiter: unit separator

  export const toKey = (scope: Scope): string => scope.join(separator);

  export const fromKey = (key: string): Scope => key.split(separator);
}

export type Emitter<E extends Event = Event, Return = void> = AsyncGenerator<
  E,
  Return,
  void
>;

export namespace Options {
  export interface Begin {
    message?: string;
  }

  export interface Update {
    message: string;
  }

  export interface Succeed {
    label?: any;
    message?: string;
  }

  export interface Resolve {
    label?: any;
    payload?: string;
  }

  export interface Fail {
    cascade?: boolean;
    error?: Error;
  }

  export interface Abort {
    cascade?: boolean;
  }

  export interface Remove {}

  export interface Declare {
    identifier: string;
    message?: string;
  }

  export interface Step {
    identifier?: string;
    message?: string;
  }
}

export interface Event {
  type: string;
  scope: Scope;
}

export namespace Events {
  export interface Begin {
    type: "begin";
    scope: Scope;
    message?: string;
  }

  export interface Update {
    type: "update";
    scope: Scope;
    message: string;
  }

  export interface Succeed {
    type: "succeed";
    scope: Scope;
    label?: any;
    message?: string;
  }

  export interface Resolve {
    type: "resolve";
    scope: Scope;
    label?: any;
    payload?: string;
  }

  export interface Fail {
    type: "fail";
    scope: Scope;
    error: Error;
  }

  export interface Abort {
    type: "abort";
    scope: Scope;
  }

  export interface Remove {
    type: "remove";
    scope: Scope;
  }

  export interface Declare {
    type: "declare";
    scope: Scope;
    message: string;
  }

  export interface Step {
    type: "step";
    scope: Scope;
    message?: string;
  }
}

export interface Step {
  readonly state: State;

  begin(options?: Options.Begin): Emitter<Events.Begin>;

  succeed(options?: Options.Succeed): Emitter<Events.Succeed>;
  resolve(options?: Options.Resolve): Emitter<Events.Resolve>;

  fail(
    options?: Options.Fail
  ): Emitter<Events.Fail | Events.Abort | Events.Remove>;
  abort(options?: Options.Abort): Emitter<Events.Abort | Events.Remove>;
  remove(options?: Options.Remove): Emitter<Events.Remove>;

  update(options: Options.Update): Emitter<Events.Update>;

  declare(options: Options.Declare): Emitter<Events.Declare, Unknown>;
  step(options: Options.Step): Emitter<Events.Step, Step>;
}

export interface Unknown {
  resolve(options: Options.Resolve): Emitter<Events.Resolve>;
  fail(
    options?: Options.Fail
  ): Emitter<Events.Fail | Events.Abort | Events.Remove>;
  extend(options: Options.Declare): Emitter<Events.Declare, Unknown>;
}

export interface Controls {
  log: (options: Options.Update) => Emitter<Events.Update>;
  declare: (options: Options.Declare) => Emitter<Events.Declare, Unknown>;
  step: (options: Options.Step) => Emitter<Events.Step, Step>;
}

export enum State {
  Pending = "pending",
  Active = "active",
  Done = "done",
  Error = "error"
}

interface StepLogConstructorOptions {
  scope: Scope;
  state?: State;
  parent?: Step;
}

class StepLog implements Step {
  public state: State;
  private scope: Scope;
  private parent?: Step;
  private children: Step[];

  constructor({
    scope,
    parent,
    state = State.Pending
  }: StepLogConstructorOptions) {
    this.scope = scope;
    this.state = state;
    this.parent = parent;
    this.children = [];
  }

  async *begin() {
    // can only begin not begun yet
    if (this.state !== State.Pending) {
      return;
    }

    yield this.emit<Events.Begin>({
      type: "begin"
    });

    this.state = State.Active;
  }

  async *succeed({ label, message }: Options.Succeed = {}) {
    // only meaningful to succeed if we're currently active
    if (this.state !== State.Active) {
      return;
    }

    yield this.emit<Events.Succeed>({
      type: "succeed",
      label,
      message
    });

    this.state = State.Done;
  }

  async *resolve({ label, payload }: Options.Resolve = {}) {
    // only meaningful to succeed if we're currently active
    if (this.state !== State.Active) {
      return;
    }

    yield this.emit<Events.Resolve>({
      type: "resolve",
      label,
      payload
    });

    this.state = State.Done;
  }

  async *fail({ error, cascade = true }: Options.Fail = {}) {
    // only meaningful to fail if we're currently active
    if (this.state !== State.Active) {
      return;
    }

    // stop all children
    for (const child of this.children) {
      yield* child.remove();
    }

    yield this.emit<Events.Fail>({
      type: "fail",
      error
    });

    this.state = State.Error;

    // propagate to parent
    if (this.parent && cascade) {
      yield* this.parent.abort({ cascade });
    }
  }

  async *abort({ cascade = true }: Options.Abort = {}) {
    // only meaningful to stop if we're currently active
    if (this.state !== State.Active) {
      return;
    }

    // stop all children
    for (const child of this.children) {
      yield* child.remove();
    }

    yield this.emit<Events.Abort>({
      type: "abort"
    });

    this.state = State.Error;

    // propagate to parent
    if (this.parent && cascade) {
      yield* this.parent.abort({ cascade });
    }
  }

  async *remove({  }: Options.Remove = {}) {
    // only meaningful to stop if we're currently active
    if (this.state !== State.Active) {
      return;
    }

    // stop all children
    for (const child of this.children) {
      yield* child.remove();
    }

    yield this.emit<Events.Remove>({
      type: "remove"
    });
  }

  async *update({ message }: Options.Update) {
    yield this.emit<Events.Update>({
      type: "update",
      message
    });
  }

  async *declare({ identifier, message }: Options.Declare) {
    const parent: Step = this;

    const child = new StepLog({
      scope: [...this.scope, identifier],
      parent,
      state: State.Active
    });

    this.children.push(child);

    yield child.emit<Events.Declare>({
      type: "declare",
      message: message || identifier
    });

    return {
      async *resolve({ label, payload }: Options.Resolve) {
        yield* child.resolve({ label, payload });
      },

      async *fail({ error }: Options.Fail) {
        yield* child.fail({ error });
      },

      async *extend(options: Options.Declare) {
        return yield* child.declare(options);
      }
    };
  }

  async *step({ identifier, message }: Options.Step) {
    const parent: Step = this;

    const child = new StepLog({
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

  private emit<E extends Event>(event: Omit<E, "scope">): E {
    return {
      ...Object.entries(event)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => ({ [key]: value }))
        .reduce((a, b) => ({ ...a, ...b })),

      scope: this.scope
    } as E;
  }
}

export const createController = (module: string) => {
  const step = new StepLog({ scope: [module] });

  return {
    begin: step.begin.bind(step),
    succeed: step.succeed.bind(step),
    fail: step.fail.bind(step),
    getState: () => step.state,

    controls: {
      log: step.update.bind(step),
      declare: step.declare.bind(step),
      step: step.step.bind(step)
    }
  };
};
