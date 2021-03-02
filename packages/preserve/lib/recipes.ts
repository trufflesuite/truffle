import { Target } from "./targets";

import { Process, Controls } from "./control";

export interface ConstructorOptions {}

export interface Constructor {
  help?: string;

  new (options: ConstructorOptions): Recipe;
}

export interface PreserveOptions {
  target: Target;
  results?: Map<string, any>;
  settings?: any;
  controls: Controls;
}

export interface Recipe {
  name: string;
  dependencies: string[];

  preserve(options: PreserveOptions): Process;
}
