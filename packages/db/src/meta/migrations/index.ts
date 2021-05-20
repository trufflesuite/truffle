import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:migrations");

import {
  Collections,
  CollectionName
} from "@truffle/db/meta/collections";
import { Adapter } from "@truffle/db/meta/pouch";

export type LegacyInput<C extends Collections> = {
  [N in CollectionName<C>]?: {};
};

export type Version = { version: string; };

export type Migration<C extends Collections> = {
  after: Version;
  name?: string;
  desription?: string;
  execute(adapter: Adapter<C>): Promise<void>;
};

export type MigrateOptions<C extends Collections> = {
  after?: Version;
  before?: Version;
}

export type Migrate<C extends Collections> =
  (options: MigrateOptions<C>) => Promise<void>;

export type Apply<C extends Collections> =
  <M extends Migration<C>>(migration: M) => Promise<void>;

// export const forAdapter = <C extends Collections>(
//   adapter: Adapter<C>
// ) => ({
// });

