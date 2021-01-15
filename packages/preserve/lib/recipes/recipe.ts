import { Target } from "../targets";

import { Process } from "../processes";
import { Controls } from "../controllers";

export interface ConstructorOptions {}

export interface Constructor {
  help?: string;
  new (options: ConstructorOptions): Recipe;
}

export interface PreserveOptions {
  target: Target;
  labels?: Map<string, any>;
  settings?: any;
  controls: Controls;
}

export type Label = any;

export interface Recipe {
  name: string;

  dependencies: string[];

  preserve(options: PreserveOptions): Process;
}
