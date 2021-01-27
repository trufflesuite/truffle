import { logger } from "@truffle/db/logger";
const debug = logger("db:system");

import type TruffleConfig from "@truffle/config";
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
 *   workingDirectory: string;
 *   adapter?:
 *     | {
 *         name: "couch";
 *         settings?: Meta.Pouch.Adapters.Couch.DatabasesSettings;
 *       }
 *     | {
 *         name: "fs";
 *         settings?: Meta.Pouch.Adapters.Fs.DatabasesSettings;
 *       }
 *     | {
 *         name: "memory";
 *         settings?: Meta.Pouch.Adapters.Memory.DatabasesSettings;
 *       }
 *     | {
 *         name: "sqlite";
 *         settings?: Meta.Pouch.Adapters.Sqlite.DatabasesSettings;
 *       }
 * };
 * ```
 *
 * See individual settings interfaces:
 *   - [[Meta.Pouch.Adapters.Couch.DatabasesSettings]]
 *   - [[Meta.Pouch.Adapters.Fs.DatabasesSettings]]
 *   - [[Meta.Pouch.Adapters.Memory.DatabasesSettings]]
 *   - [[Meta.Pouch.Adapters.Sqlite.DatabasesSettings]]
 *
 * Default adapter: `{ name: "sqlite" }`
 *
 * We recommend using only `"sqlite"` and `"couch"` at this time.
 */
export type ConnectOptions = Meta.ConnectOptions<Collections>;

const system = Meta.forDefinitions(definitions);

export const connect: (
  options: TruffleConfig | ConnectOptions | undefined
) => Db = system.connect;

export const serve: (
  options: TruffleConfig | ConnectOptions | undefined
) => ApolloServer = system.serve;

export type StrictIdInput<N extends CollectionName> = Meta.Id.StrictIdInput<
  Collections,
  N
>;

export type GenerateId = <N extends CollectionName>(
  collectionName: N,
  input: StrictIdInput<N> | Input<N>
) => string;

export const generateId: GenerateId = system.generateId;

export const { schema, attach, resources, forDb } = system;
