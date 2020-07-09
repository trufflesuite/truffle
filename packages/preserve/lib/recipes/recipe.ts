import { Target } from "../targets";

import { Process, Step, Steps, Unknown, Unknowns } from "../processes";

export interface ConstructorOptions {}

export interface Constructor {
  help?: string;
  new (options: ConstructorOptions): Recipe;
}

export interface PreserveOptions {
  target: Target;
  labels?: Map<string, any>;
  settings?: any;
  log(options: Steps.Options.Log): Process<void, Steps.Events.Log>;
  declare(
    options: Unknowns.Options.Declare
  ): Process<Unknown, Unknowns.Events.Declare>;
  step(options: Steps.Options.Step): Process<Step, Steps.Events.Step>;
}

export type Label = any;

export interface Recipe {
  name: string;

  dependencies: string[];

  preserve(options: PreserveOptions): Process;
}
