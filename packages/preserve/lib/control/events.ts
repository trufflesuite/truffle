import { Scope } from "./scopes";

export type EventName =
  | "fail"
  | "abort"
  | "stop"
  | "begin"
  | "log"
  | "succeed"
  | "step"
  | "declare"
  | "resolve"
  | "update";

export interface Event {
  type: EventName;
  scope: Scope;
}

export namespace Events {
  // Error events
  export interface Fail extends Event {
    type: "fail";
    error: Error;
  }

  export interface Abort extends Event {
    type: "abort";
  }

  export interface Stop extends Event {
    type: "stop";
  }

  // Steps events
  export interface Begin extends Event {
    type: "begin";
    message?: string;
  }

  export interface Log extends Event {
    type: "log";
    message: string;
  }

  export interface Succeed extends Event {
    type: "succeed";
    result?: any;
    message?: string;
  }

  export interface Step extends Event {
    type: "step";
    message?: string;
  }

  // Value resolution events
  export interface Declare extends Event {
    type: "declare";
    message: string;
  }

  export interface Resolve extends Event {
    type: "resolve";
    resolution?: any;
    payload?: string;
  }

  export interface Update extends Event {
    type: "update";
    payload?: string;
  }
}
