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

  export interface Fail {
    error?: Error;
  }

  export interface Declare {
    identifier: string;
    message?: string;
  }

  export interface Step {
    identifier: string;
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

  export interface Fail {
    type: "fail";
    scope: Scope;
    error: Error;
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
  begin(options?: Options.Begin): Emitter<Events.Begin>;
  succeed(options?: Options.Succeed): Emitter<Events.Succeed>;
  fail(options?: Options.Fail): Emitter<Events.Fail>;

  update(options: Options.Update): Emitter<Events.Update>;

  declare(options: Options.Declare): Emitter<Events.Declare, Unknown>;
  step(options: Options.Step): Emitter<Events.Step, Step>;
}

export interface Unknown {
  resolve(options: Options.Succeed): Emitter<Events.Succeed>;
  extend(options: Options.Declare): Emitter<Events.Declare, Unknown>;
}

export interface Controls {
  log: (options: Options.Update) => Emitter<Events.Update>;
  declare: (options: Options.Declare) => Emitter<Events.Declare, Unknown>;
  step: (options: Options.Step) => Emitter<Events.Step, Step>;
}

enum State {
  Pending = "pending",
  Active = "active",
  Done = "done",
  Error = "error"
}

interface StepLogConstructorOptions {
  scope: Scope;
  state?: State;
}

class StepLog implements Step {
  private state: State;
  private scope: Scope;

  constructor({ scope, state = State.Pending }: StepLogConstructorOptions) {
    this.scope = scope;
    this.state = state;
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

  async *fail({ error }: Options.Fail = {}) {
    // only meaningful to succeed if we're currently active
    if (this.state !== State.Active) {
      return;
    }

    yield this.emit<Events.Fail>({
      type: "fail",
      error
    });

    this.state = State.Error;
  }

  async *update({ message }: Options.Update) {
    yield this.emit<Events.Update>({
      type: "update",
      message
    });
  }

  async *declare({ identifier, message }: Options.Declare) {
    const child = new StepLog({
      scope: [...this.scope, identifier],
      state: State.Active
    });

    yield child.emit<Events.Declare>({
      type: "declare",
      message: message || identifier
    });

    return {
      async *resolve({ label, message }: Options.Succeed) {
        yield* child.succeed({ label, message });
      },

      async *extend(options: Options.Declare) {
        return yield* child.declare(options);
      }
    };
  }

  async *step({ identifier, message }: Options.Step) {
    const child = new StepLog({
      scope: [...this.scope, identifier],
      state: State.Active
    });

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

    controls: {
      log: step.update.bind(step),
      declare: step.declare.bind(step),
      step: step.step.bind(step)
    }
  };
};
