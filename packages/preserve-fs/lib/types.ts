import * as Preserve from "@truffle/preserve";

export interface ExecuteOptions extends Preserve.Recipes.ExecuteOptions {
  inputs: { path: string };
  settings: { verbose?: boolean };
}

export interface ExecuteResult {
  "fs-target": Preserve.Target;
}

export interface TargetPathOptions {
  controls: Preserve.Controls | Preserve.Control.StepsController;
  path: string;
  verbose: boolean;
}

export interface PathEntryOptions extends TargetPathOptions {
  parent: string;
}
