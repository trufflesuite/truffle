import { Scope } from "./scopes";

export interface Event {
  type: string;
  scope: Scope;
}

export type Return = any;

export interface Methods {
  [name: string]: {
    options: {};
    event: Event;
    return?: any;
  };
}

export interface Config {
  methods: Methods;
}
