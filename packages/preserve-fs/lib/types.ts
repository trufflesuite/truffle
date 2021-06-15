import type * as Preserve from "@truffle/preserve";

export interface TargetPathOptions {
  controls: Preserve.Controls | Preserve.Control.StepsController;
  path: string;
  verbose: boolean;
}

export interface PathEntryOptions extends TargetPathOptions {
  parent: string;
}
