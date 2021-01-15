import { Target } from "./types";

import { Process } from "../processes";
import { Controls } from "../controllers";

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
