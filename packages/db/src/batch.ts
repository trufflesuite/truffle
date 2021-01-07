import { logger } from "@truffle/db/logger";
const debug = logger("db:batch");

import * as Meta from "@truffle/db/meta";
import { Process } from "@truffle/db/process";

export type Configure = <B extends Batch>(
  options: Options<B>
) => <I extends Input<B>, O extends Output<B>>(
  inputs: Inputs<B, I>
) => Process<Outputs<B, O>>;

export const configure: Configure = Meta.Batch.configure;

export type Batch = Meta.Batch.Batch;
export type Options<B extends Meta.Batch.Batch> = Meta.Batch.Options<B>;
export type Input<B extends Meta.Batch.Batch> = Meta.Batch.Input<B>;
export type Inputs<
  B extends Meta.Batch.Batch,
  I extends Input<B>
> = Meta.Batch.Inputs<B, I>;
export type Output<B extends Meta.Batch.Batch> = Meta.Batch.Output<B>;
export type Outputs<
  B extends Meta.Batch.Batch,
  O extends Output<B>
> = Meta.Batch.Outputs<B, O>;
