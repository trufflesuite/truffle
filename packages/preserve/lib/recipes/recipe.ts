import { Target } from "../targets";

export interface ConstructorOptions {}

export interface Constructor {
  help?: string;
  new (options: ConstructorOptions): Recipe;
}

export interface PreserveOptions {
  target: Target;
  labels: Map<string, any>;
  settings: any;
}

export interface Recipe {
  name: string;

  dependencies: string[];

  preserve(options: PreserveOptions): Promise<any>;
}
