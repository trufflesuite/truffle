import { Target } from "../types";

export interface ConstructorOptions {}

export interface Constructor {
  new (options?: ConstructorOptions): Loader;
}

export interface LoadOptions {}

export interface Loader {
  name: string;

  load(options: LoadOptions): Promise<Target>;
}
