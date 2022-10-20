/**
 * # @truffle/db API documentation
 *
 * ## Introduction
 *
 * **@truffle/db** tracks information about smart contracts and their
 * development histories. It organizes this information almost entirely in the
 * form of **content-addressed, immutable resources** and seeks to serve as a
 * **complete system of record**, suitable to perfectly reproduce prior builds
 * and to act as a single source of truth.
 *
 * This system of record covers the full gamut of concepts related to smart
 * contract development, from source code to deployment. Among other features,
 * it includes mechanisms for tracking the continuity of a smart contract as it
 * is implemented and even as the network to which it's deployed experiences
 * a hard-fork. **Blockchain data is not forgotten — neither should blockchain
 * metadata.**
 *
 * At a high-level, this package provides a
 * [GraphQL](https://graphql.org/) interface and stores data via one of
 * several persistence backends thanks to [PouchDB](https://pouchdb.com/).
 * Use of this package directly is intended mostly for other tools – end users
 * can find interfaces to @truffle/db by way of Truffle itself, e.g. with the
 * `truffle db serve` command that starts a GraphQL Playground HTTP server.
 *
 * This documentation serves to organize the modules and namespaces included
 * in the package, both for tool developer reference and for continued work
 * on @truffle/db itself. (Disclaimer: as a result, this API documentation
 * may serve neither of these purposes well. Please reach out with questions
 * and/or to suggest helpful clarifications!)
 *
 * Continue reading below for an overview and full index of this package's
 * exports.
 *
 * ---
 *
 * <figure style="text-align: center">
 * <img
 *   src="media://images/example-query.png"
 *   alt="Example query"
 *   style="width: 85%" />
 * <figcaption style="font-size: small; font-style: italic">
 * <strong>Figure</strong>:
 * Example query for a project's <code>MagicSquare</code> contract
 * </figcaption>
 * </figure>
 *
 * ---
 *
 * ## Contents
 *
 * For quick reference, this documentation summary contains the following
 * headings:
 *
 * - [Introduction](#introduction)
 *
 * - [Contents](#contents)
 *
 * - [Core library interface](#core-library-interface)
 *   - [Instantiating @truffle/db](#instantiating-truffledb)
 *   - [GraphQL schema](#graphql-schema)
 *
 * - [Data model](#data-model)
 *   - [Structure](#structure)
 *   - [List of collections](#list-of-collections)
 *
 * - [Other interfaces](#other-interfaces)
 *   - [JavaScript / TypeScript interface](#javascript---typescript-interface)
 *   - [Network abstraction](#network-abstraction)
 *   - [Truffle project abstraction](#truffle-project-abstraction)
 *   - [HTTP interface](#http-interface)
 *
 * - [Additional materials](#additional-materials)
 *
 * ## Core library interface
 *
 * ### Instantiating @truffle/db
 *
 * This package defines the primary [[connect | `connect()`]] function, which
 * returns an object adhering to the [[Db]] interface for given
 * [ConnectOptions](#connectoptions).
 * This [[Db]] interface defines the `async`
 * [[Meta.Db.execute | `db.execute()`]]
 * method that accepts a GraphQL request and returns a GraphQL response.
 *
 * ### GraphQL schema
 *
 * \@truffle/db makes its GraphQL schema available as the exported
 * [[Graph.schema | `Graph.schema`]] variable, or view the SDL
 * details in the [[Graph]] namespace description.
 *
 * ## Data model
 *
 * ### Structure
 *
 * Data is organized as collections of representations of key
 * concepts related to smart contract development. Each collection specifies:
 *   - A collection name
 *   - A complete resource type (exported as
 *     [[Resources.Resource | `Resources.Resource<"<collectionName>">`]]; for
 *     retrieved records)
 *   - An input type (exported as
 *     [[Resources.Input | `Resources.Input<"<collectionName>">`]]; for
 *     new records)
 *   - A subset list of fields from its input type whose values strictly
 *     compose to form a resource's content-addressable ID.
 *   - Whether its resources are mutable (**note**: currently, only
 *     `"projectNames"` resources are mutable)
 *   - Whether its resources are named (meaning that resources of the same
 *     and collection will be tracked by name, for continuity and easy lookup)
 *
 * ### List of collections
 *
 * \@truffle/db defines the following collections:
 *   - `"bytecodes"`
 *     [_resource_: [[DataModel.Bytecode | Bytecode]];
 *     _input_: [[DataModel.BytecodeInput | BytecodeInput]]]
 *   - `"compilations"`
 *     [_resource_: [[DataModel.Compilation | Compilation]];
 *     _input_: [[DataModel.CompilationInput | CompilationInput]]]
 *   - `"contracts"`
 *     [_**named**_; _resource_: [[DataModel.Contract | Contract]];
 *     _input_: [[DataModel.ContractInput | ContractInput]]]
 *   - `"contractInstances"`
 *     [_resource_: [[DataModel.ContractInstance | ContractInstance]];
 *     _input_: [[DataModel.ContractInstanceInput | ContractInstanceInput]]]
 *   - `"nameRecords"`
 *     [_resource_: [[DataModel.NameRecord | NameRecord]];
 *     _input_: [[DataModel.NameRecordInput | NameRecordInput]]]
 *   - `"networks"`
 *     [_**named**_; _resource_: [[DataModel.Network | Network]];
 *     _input_: [[DataModel.NetworkInput | NetworkInput]]]
 *   - `"networkGenealogies"`
 *     [_resource_: [[DataModel.NetworkGenealogy | NetworkGenealogy]];
 *     _input_: [[DataModel.NetworkGenealogyInput | NetworkGenealogyInput]]]
 *   - `"projectNames"`
 *     [_**mutable**_; _resource_: [[DataModel.ProjectName | ProjectName]];
 *     _input_: [[DataModel.ProjectNameInput | ProjectNameInput]]]
 *   - `"projects"`
 *     [_resource_: [[DataModel.Project | Project]];
 *     _input_: [[DataModel.ProjectInput | ProjectInput]]]
 *   - `"sources"`
 *     [_resource_: [[DataModel.Source | Source]];
 *     _input_: [[DataModel.SourceInput | SourceInput]]]
 *
 * This list is not intended to be static; since @truffle/db is in early
 * release, it may make sense to add new collections / change relationships
 * between existing collections. Backwards compatibility is planned but not yet
 * guaranteed.
 *
 * ## Other interfaces
 *
 * ### JavaScript / TypeScript interface
 *
 * This package exposes programmatic interfaces for working with
 * the resources listed above:
 *   - [[Process.resources]], a set of four generator functions that encode
 *     logic for storing and retrieving resources for a given `collectionName`.
 *
 *   - [[Process.Run.forDb()]], to construct an `async` helper that facilitates
 *     requests/responses from/to the above generator functions against a given
 *     [[Db]] instance.
 *
 *   - [[generateId | generateId()]], to predict the ID for a given resource
 *     input. This can be useful for determining how to query for additional
 *     information about entities with known properties.
 *
 * In addition, please see the [[Resources]] module for handy helper types for
 * dealing with @truffle/db entities.
 *
 * ### Network abstraction
 *
 * Keeping track of blockchain networks is nontrivial if you want to handle
 * network forks/re-orgs. To accommodate this, @truffle/db models
 * blockchain networks as individual point-in-time slices at various historic
 * blocks. As a result, a single blockchain network (e.g., "mainnet") can and
 * will comprise many disparate [[DataModel.Network]] resources, one for each
 * block previously added.
 *
 * This approach preserves immutability but requires additional record-keeping
 * in order to provide the commonly-understood continuous view of a blockchain.
 * To maintain this continuity, @truffle/db defines the
 * [[DataModel.NetworkGenealogy]] resource, each of which links two
 * [[DataModel.Network]] resources, stating that a given network is ancestor
 * to another. This collection of genealogy pairs is then used to compute a
 * sparse list of past historic blocks for a given latest network.
 *
 * The process to populate @truffle/db with correct network data involves
 * alternately querying GraphQL and the underlying blockchain JSON-RPC.
 *
 * This package provides the [[Network]] abstraction to simplify this process.
 *
 * <details>
 * <summary>Example usage</summary>
 *
 * ```typescript
 * import type { Provider } from "web3/providers";
 * declare const provider: Provider;
 *
 * import { connect, Network } from "@truffle/db";
 *
 * const db = connect({
 *   // ...
 * });
 *
 * const network = await Network.initialize({
 *   provider,
 *   db: connect({
 *     // ...
 *   }),
 *   network: { name: "mainnet" }
 * });
 *
 * await network.includeBlocks([
 *   { height: 10000000, hash: "0x..." },
 *   // ...
 * ]);
 *
 * const { historicBlock } = network.knownLatest;
 * ```
 *
 * </details>
 *
 * ### Truffle project abstraction
 *
 * This package also provides an abstraction to interface with other
 * Truffle data formats, namely `WorkflowCompileResult`, returned by
 * \@truffle/workflow-compile, and the Truffle contract artifacts format,
 * defined by @truffle/contract-schema. This abstraction covers two classes:
 *   - [[Project.Project]] for operations that **do not** require a network
 *     connection. Use function [[Project.initialize | `Project.initialize()`]]
 *     to create.
 *   - [[Project.ConnectedProject]] for operations that **do** require a
 *     blockchain network. Use existing project abstraction's
 *     [[Project.connect | `project.connect()`]] method to create.
 *
 * ### HTTP interface
 *
 * This package exposes the [[serve | `serve()`]] function, which returns an
 * [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
 * instance, adherent to the
 * [Node.js `http.Server`](https://nodejs.org/api/http.html#http_class_http_server)
 * interface. This server runs
 * [GraphQL Playground](https://github.com/graphql/graphql-playground) for the
 * browser and also accepts plain GraphQL requests.
 *
 * _(This is a handy way to explore @truffle/db, since it offers schema-aware
 * auto-completion and the ability to explore relationships between entities.)_
 *
 * ## Additional materials
 *
 * This package listing contains other namespaces not mentioned above.
 * These are for internal use and not to be considered part of @truffle/db's
 * public interface.
 *
 * For those curious about these internals, of particular note is the [[Meta]]
 * namespace, which houses underlying collections-agnostic logic for
 * integrating GraphQL and PouchDB.
 *
 * @packageDocumentation
 */ /** */

import debugModule from "debug";
const debug = debugModule("db");

import * as Network from "./network";
export { Network };

export { DataModel } from "./resources";
export type { Db } from "./resources";

import * as Project from "./project";
export { Project };

import * as Resources from "./resources";
export { Resources };

export type { ConnectOptions } from "./system";
import * as _System from "./system";

/**
 * Instantiate @truffle/db for given [[ConnectOptions]]
 */
export const connect = _System.connect;

/**
 * Create an Apollo GraphQL server for @truffle/db for given [[ConnectOptions]]
 *
 * See
 * [Apollo Server documentation](https://www.apollographql.com/docs/apollo-server/)
 * for more information.
 */
export const serve = _System.serve;

/**
 * Compute an ID for a given collection name and input. This accepts either
 * a full [[Resources.Input | `Resources.Input<"<collectionName>">`]]
 * representation or an object containing only the relevant subset of
 * [[Resources.IdFields | `Resources.IdFields<"<collectionName>">`]].
 */
export const generateId = _System.generateId;

/**
 * # GraphQL-related exports for @truffle/db
 *
 * ## SDL
 *
 * <details>
 * <summary>@truffle/db SDL</summary>
 *
 * ```graphql
 * [[include:schema.sdl]]
 * ```
 *
 * </details>
 *
 * @category Primary
 */
export namespace Graph {
  export const schema = _System.schema;
}

/**
 * @category Internal
 */
export namespace Pouch {
  export const attach = _System.attach;
}

import * as Process from "./process";
export { Process };

import * as Meta from "./meta";
export { Meta };
