/**
 * # @truffle/db API documentation
 *
 * \@truffle/db tracks information about smart contracts and their development
 * histories.
 *
 * ## Core library interface
 *
 * This package defines the primary [[connect | `connect()`]] function, which
 * returns an object adhering to the [[Db]] interface for given
 * [ConnectOptions](#connectoptions).
 * This [[Db]] interface defines the `async`
 * [[Meta.Db.execute | `db.execute()`]]
 * method that accepts a GraphQL request and returns a GraphQL response.
 *
 * ## Truffle-specific interface
 *
 * This package also provides an abstraction to interface with other
 * Truffle data formats, namely `WorkflowCompileResult`s, returned by
 * \@truffle/workflow-compile, and the Truffle contract artifacts format,
 * defined by @truffle/contract-schema. This abstraction covers two classes:
 *   - [[Project]] for operations that **do not** require a network connection.
 *     Use static [[Project.initialize | `Project.initialize()`]] to create.
 *   - [[Project.ConnectedProject]] for operations that **do** require a
 *     blockchain network. Use existing project abstraction's
 *     [[Project.connect | `project.connect()`]] method to create.
 *
 * ## Data model
 *
 * \@truffle/db models data as a number of collections of key types related to
 * smart contract development. Each of these is identified by `collectionName`,
 * corresponds to a type that represents valid input for a given
 * resource to this collection, and corresponds to a type that represents the
 * full representation of a resource in this collection:
 *
 *   - **`"bytecodes"`**
 *     [resource: [[DataModel.Bytecode | Bytecode]],
 *     input: [[DataModel.BytecodeInput | BytecodeInput]]]
 *
 *   - **`"compilations"`**
 *     [resource: [[DataModel.Compilation | Compilation]],
 *     input: [[DataModel.CompilationInput | CompilationInput]]]
 *
 *   - **`"contracts"`**
 *     [resource: [[DataModel.Contract | Contract]],
 *     input: [[DataModel.ContractInput | ContractInput]]]
 *
 *   - **`"contractInstances"`**
 *     [resource: [[DataModel.ContractInstance | ContractInstance]],
 *     input: [[DataModel.ContractInstanceInput | ContractInstanceInput]]]
 *
 *   - **`"nameRecords"`**
 *     [resource: [[DataModel.NameRecord | NameRecord]],
 *     input: [[DataModel.NameRecordInput | NameRecordInput]]]
 *
 *   - **`"networks"`**
 *     [resource: [[DataModel.Network | Network]],
 *     input: [[DataModel.NetworkInput | NetworkInput]]]
 *
 *   - **`"networkGenealogys"`**
 *     [resource: [[DataModel.NetworkGenealogy | NetworkGenealogy]],
 *     input: [[DataModel.NetworkGenealogyInput | NetworkGenealogyInput]]]
 *
 *   - **`"projectNames"`**
 *     [resource: [[DataModel.ProjectName | ProjectName]],
 *     input: [[DataModel.ProjectNameInput | ProjectNameInput]]]
 *
 *   - **`"projects"`**
 *     [resource: [[DataModel.Project | Project]],
 *     input: [[DataModel.ProjectInput | ProjectInput]]]
 *
 *   - **`"sources"`**
 *     [resource: [[DataModel.Source | Source]],
 *     input: [[DataModel.SourceInput | SourceInput]]]
 *
 * ## JavaScript / TypeScript interface for resource entry / retrieval
 *
 * This package exposes programmatic interfaces for working with
 * the resources listed above:
 *   - [[Process.resources]], a set of four generator functions that encode
 *     logic for storing and retrieving resources for a given `collectionName`.
 *
 *   - [[Process.Run.forDb]], to construct an `async` helper that facilitates
 *     requests/responses from/to the above generators against a given [[Db]]
 *     instance.
 *
 * ## GraphQL Schema
 *
 * \@truffle/db makes its GraphQL schema available as the exported
 * [[GraphQl.schema | `GraphQl.schema`]] variable.
 *
 * ## HTTP interface
 *
 * This package exposes the [[serve | `serve()`]] function, which starts an
 * HTTP server on port 4444. This server runs
 * [GraphQL Playground](https://github.com/graphql/graphql-playground) and
 * accepts plain GraphQL requests.
 *
 *
 * ## Other namespaces
 *
 * This package listing contains other namespaces not mentioned here.
 * These are for internal use and not to be considered part of @truffle/db's
 * external interface.
 *
 * For those curious about these internals, of particular note is the [[Meta]]
 * namespace, which houses underlying resource-agnostic logic for integrating
 * GraphQL and PouchDB.
 *
 * @packageDocumentation
 */ /** */

import debugModule from "debug";
const debug = debugModule("db");

require("source-map-support/register");

import * as Meta from "./meta";
export { Meta };

export { Project } from "./project";

export { DataModel, Db } from "./resources";
import * as Resources from "./resources";
export { Resources };

export { ConnectOptions } from "./system";
import * as _System from "./system";
export const connect = _System.connect;
export const serve = _System.serve;

export namespace System {
  export namespace GraphQl {
    export const schema = _System.schema;
  }

  export namespace Pouch {
    export const attach = _System.attach;
  }
}

import * as Process from "./process";
export { Process };
