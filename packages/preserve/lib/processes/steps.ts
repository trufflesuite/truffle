import { Task, Process, State } from "./tasks";
import { Scope } from "./scopes";

import { Unknown } from "./unknowns";
import * as Unknowns from "./unknowns";

import * as Errors from "./errors";

export type Config = {
  methods: {
    begin: {
      options: Options.Begin;
      event: Events.Begin;
    };

    log: {
      options: Options.Log;
      event: Events.Log;
    };

    succeed: {
      options: Options.Succeed;
      event: Events.Succeed;
    };

    declare: {
      options: Unknowns.Options.Declare;
      event: Unknowns.Events.Declare;
      return: Unknown;
    };

    step: {
      options: Options.Step;
      event: Events.Step;
      return: Step;
    };
  };
};

export interface Step extends Task<Config & Errors.Config> {
  readonly state: State;

  begin(options?: Options.Begin): Process<void, Events.Begin>;
  log(options: Options.Log): Process<void, Events.Log>;
  succeed(options?: Options.Succeed): Process<void, Events.Succeed>;
  declare(
    options: Unknowns.Options.Declare
  ): Process<Unknown, Unknowns.Events.Declare>;
  step(options: Options.Step): Process<Step, Events.Step>;
}

export namespace Events {
  export interface Begin {
    type: "begin";
    scope: Scope;
    message?: string;
  }

  export interface Log {
    type: "log";
    scope: Scope;
    message: string;
  }

  export interface Succeed {
    type: "succeed";
    scope: Scope;
    label?: any;
    message?: string;
  }

  export interface Step {
    type: "step";
    scope: Scope;
    message?: string;
  }
}

export namespace Options {
  export interface Begin {
    message?: string;
  }

  export interface Log {
    message: string;
  }

  export interface Succeed {
    label?: any;
    message?: string;
  }

  export interface Step {
    identifier?: string;
    message?: string;
  }
}

export interface ControllerConstructorOptions
  extends Errors.ControllerConstructorOptions {}

export class Controller extends Errors.Controller implements Step {
  constructor(options: ControllerConstructorOptions) {
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

  async *log({ message }: Options.Log) {
    yield this.emit<Events.Log>({
      type: "log",
      message
    });
  }

  async *declare({ identifier, message }: Unknowns.Options.Declare) {
    const parent: Step = this;

    const child = new Unknowns.Controller({
      scope: [...this.scope, identifier],
      parent,
      state: State.Active
    });

    this.children.push(child);

    yield child.emit<Unknowns.Events.Declare>({
      type: "declare",
      message: message || identifier
    });

    return child;
  }

  async *step({ identifier, message }: Options.Step) {
    const parent: Step = this;

    const child = new Controller({
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
