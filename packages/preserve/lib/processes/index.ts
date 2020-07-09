export { Step } from "./steps";
import * as Steps from "./steps";
export { Steps };

export { Unknown } from "./unknowns";
import * as Unknowns from "./unknowns";
export { Unknowns };

import * as Errors from "./errors";
export { Errors };

export { Scope } from "./scopes";
import * as Scopes from "./scopes";
export { Scopes };

import * as Tasks from "./tasks";
export { State } from "./tasks";

/**
 * Represents the allowable events produced by a @truffle/preserve task
 */
export type Event = Tasks.Event<Errors.Config & Unknowns.Config & Steps.Config>;

export type Task = Tasks.Task<Errors.Config & Unknowns.Config & Steps.Config>;

export type Process<R = any, E extends Event = Event> = Tasks.Process<R, E>;
