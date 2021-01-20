import * as Preserve from "@truffle/preserve";

export interface LoadOptions extends Preserve.Loaders.LoadOptions {
  path: string;
  verbose?: boolean;
}

export interface TargetPathOptions extends LoadOptions {
  controls: Preserve.Controls | Preserve.Control.StepsController;
}

export interface PathEntryOptions extends TargetPathOptions {
  parent: string;
}
