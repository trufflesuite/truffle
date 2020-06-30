import { Target } from "../types";

export interface ConstructorOptions {}

export interface Constructor {
  new (options?: ConstructorOptions): Loader;
}

export interface LoadOptions {}

export interface Loader {
  load(options: LoadOptions): Promise<Target>;
}
