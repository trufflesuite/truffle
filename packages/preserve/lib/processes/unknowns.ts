import { Task, Process, State } from "./tasks";
import { Scope } from "./scopes";

import * as Errors from "./errors";

export type Config = {
  methods: {
    resolve: {
      options: Options.Resolve;
      event: Events.Resolve;
    };

    extend: {
      options: Options.Declare;
      event: Events.Declare;
      return: Unknown;
    };
  };
};

// marking this an interface for TypeDoc reasons, rather than just doing
//
//     export type Unknown = Task<Config>;
//
export interface Unknown extends Task<Config & Errors.Config> {
  resolve(options: Options.Resolve): Process<void, Events.Resolve>;
  extend(options: Options.Declare): Process<Unknown, Events.Declare>;
}

export interface ControllerConstructorOptions
  extends Errors.ControllerConstructorOptions {}

export class Controller extends Errors.Controller implements Unknown {
  constructor(options: ControllerConstructorOptions) {
    const { ...superOptions } = options;
    super(superOptions);

    // so we can pass these around as functions
    this.extend = this.extend.bind(this);
    this.resolve = this.resolve.bind(this);
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

  async *extend({ identifier, message }: Options.Declare) {
    const parent: Unknown = this;

    const child = new Controller({
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
}

export namespace Events {
  export interface Declare {
    type: "declare";
    scope: Scope;
    message: string;
  }

  export interface Resolve {
    type: "resolve";
    scope: Scope;
    label?: any;
    payload?: string;
  }
}

export namespace Options {
  export interface Resolve {
    label?: any;
    payload?: string;
  }

  export interface Declare {
    identifier: string;
    message?: string;
  }
}
