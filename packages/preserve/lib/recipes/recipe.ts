import { Target } from "../targets";

import { Controls, Event } from "./logs";

export interface ConstructorOptions {}

export interface Constructor {
  help?: string;
  new (options: ConstructorOptions): Recipe;
}

export interface PreserveOptions extends Controls {
  target: Target;
  labels: Map<string, any>;
  settings: any;
}

export type Label = any;

export type Preserves<L extends Label = Label> = AsyncGenerator<Event, L, void>;

export interface Recipe {
  name: string;

  dependencies: string[];

  preserve(options: PreserveOptions): Preserves;
}
