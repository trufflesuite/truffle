import type { Process, Controls } from "./control";

export interface ConstructorOptions {}

export interface Constructor {
  help?: string;

  new (options: ConstructorOptions): Recipe;
}

export interface ExecuteOptions {
  inputs: any;
  settings: any;
  controls: Controls;
}

export interface Recipe {
  name: string;
  inputLabels: string[];
  outputLabels: string[];

  execute(options: ExecuteOptions): Process;
}
