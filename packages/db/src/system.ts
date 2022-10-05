import { logger } from "@truffle/db/logger";
const debug = logger("db:system");

import type { ApolloServer } from "apollo-server";

import * as Meta from "@truffle/db/meta";
import {
  Collections,
  CollectionName,
  Input,
  Db,
  definitions
} from "@truffle/db/resources";

/**
 * Options for connecting to @truffle/db
 *
 * ```typescript
 * type ConnectOptions = {
 *   adapter?:
 *     | {
 *         name: "couch";
 *         settings?: Meta.Pouch.Adapters.Couch.DatabasesSettings;
 *       }
 *     |
 *         name: "memory";
 *         settings?: Meta.Pouch.Adapters.Memory.DatabasesSettings;
 *       }
 *     | {
 *         name: "indexeddb";
 *         settings?: Meta.Pouch.Adapters.IndexedDb.DatabasesSettings;
 *       }
 * };
 * ```
 *
 * See individual settings interfaces:
 *   - [[Meta.Pouch.Adapters.Couch.DatabasesSettings]]
 *   - [[Meta.Pouch.Adapters.Fs.DatabasesSettings]]
 *   - [[Meta.Pouch.Adapters.Memory.DatabasesSettings]]
 *   - [[Meta.Pouch.Adapters.IndexedDb.DatabasesSettings]]
 *
 * Default adapter: `{ name: "indexeddb" }`
 *
 * We recommend using only `"indexeddb"` and `"couch"` at this time.
 */
export type ConnectOptions = Meta.ConnectOptions<Collections>;

const system = Meta.forDefinitions(definitions);

export const connect: (options?: ConnectOptions) => Db = system.connect;

export const serve: (options?: ConnectOptions) => ApolloServer = system.serve;

export type StrictIdInput<N extends CollectionName> = Meta.Id.StrictIdInput<
  Collections,
  N
>;

export type GenerateId = <N extends CollectionName>(
  collectionName: N,
  input: StrictIdInput<N> | Input<N> | undefined
) => string | undefined;

export const generateId: GenerateId = system.generateId;

export const { schema, attach, resources, forDb } = system;
