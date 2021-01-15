import { StepsController } from "./controllers";
import { Event } from "./events";

export enum State {
  Pending = "pending",
  Active = "active",
  Done = "done",
  Error = "error"
}

export interface HasControls {
  controls: Controls;
}

export type Controls = Pick<StepsController, "log" | "declare" | "step">;

export type Process<
  R extends any = any,
  E extends Event = Event
> = AsyncGenerator<E, R, void>;
