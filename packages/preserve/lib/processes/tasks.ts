import { Scope } from "./scopes";
import * as Base from "./base";

import { Task } from "./config";
export { Task, Process, Event } from "./config";

export enum State {
  Pending = "pending",
  Active = "active",
  Done = "done",
  Error = "error"
}

export interface ControllerConstructorOptions {
  scope: Scope;
  state?: State;
}

export class Controller implements Task<{ methods: {} }> {
  public state: State;
  protected scope: Scope;

  constructor(options: ControllerConstructorOptions) {
    const { scope, state = State.Pending } = options;

    this.scope = scope;
    this.state = state;
  }

  emit<E extends Base.Event>(event: Omit<E, "scope">): E {
    return {
      ...Object.entries(event)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => ({ [key]: value }))
        .reduce((a, b) => ({ ...a, ...b })),

      scope: this.scope
    } as E;
  }
}
