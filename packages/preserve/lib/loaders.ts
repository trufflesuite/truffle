import { Target } from "./targets";

import { Process, Controls } from "./control";

export interface ConstructorOptions {}

export interface Constructor {
  new (options?: ConstructorOptions): Loader;
}

export interface LoadOptions {
  controls: Controls;
}

export interface Loader {
  name: string;

  load(options: LoadOptions): Process<Target>;
}
