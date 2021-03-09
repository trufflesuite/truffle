import { Event } from "../events";
import { Scope } from "../scopes";
import { State } from "../types";

export interface ConstructorOptions {
  scope: Scope;
  state?: State;
}

export interface IBaseController {
  readonly state: State;
  emit<E extends Event>(event: Omit<E, "scope">): E;
}

export abstract class BaseController implements IBaseController {
  protected _state: State;
  protected scope: Scope;

  public get state() {
    return this._state;
  }

  constructor(options: ConstructorOptions) {
    const { scope, state } = options;

    this.scope = scope;
    this._state = state ?? State.Pending;
  }

  emit<E extends Event>(event: Omit<E, "scope">): E {
    return {
      ...Object.entries(event)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => ({ [key]: value }))
        .reduce((a, b) => ({ ...a, ...b })),

      scope: this.scope
    } as E;
  }
}
