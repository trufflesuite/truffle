# @truffle/supplier

This package provides infrastructure for the rest of Truffle, defining the
concept of a "supplier", a component that downloads a specific version of some
desired code resource according to one or more strategies. (For example,
@truffle/compile-solidity comprises its "CompilerSupplier", which fetches
specific solc versions from the web / via docker / et al.)

## Usage example

1. Define a common "results" specification: what does `supplier.load()` and
   `supplier.list()` return?

   <p>
   <details>
   <summary>See example results specification</summary>

   ```typescript
   export type Compiler = { compile(): any };

   export namespace Results {
     export type Specification = {
       load: Promise<Compiler>;
       list: Promise<string[]>;
     };
   }
   ```

   </details>
   </p>

2. Define one or more strategies.

   <p>
   <details>
   <summary>
   See example strategy specification (using provided mixin classes with
   <a href="https://www.npmjs.com/package/ts-mixer"><strong>ts-mixer</strong></a>
   package).
   </summary>

   ```typescript
   import { Mixin } from "ts-mixer";

   import {
     Strategy,
     AllowsLoadingSpecificVersion,
     AllowsListingVersions
   } from "@truffle/supplier";

   import { Results } from "./types";

   export namespace RemoteSoljson {
     export type Specification = {
       constructor: {
         options: { strategy: "remote-soljson" };
       };
       results: Results.Specification;
       allowsLoadingSpecificVersion: true;
       allowsListingVersions: true;
     };
   }

   export class RemoteSoljson
     extends Mixin(AllowsLoadingSpecificVersion, AllowsListingVersions)
     implements Strategy<RemoteSoljson.Specification> {
     async load(_version?: string) {
       return { compile: (): any => null };
     }

     async list(): Promise<string[]> {
       return [];
     }
   }
   ```

   </details>
   </p>

   <p>
   <details>
   <summary>
   See example strategy specification (without using mixins)
   </summary>

   ```typescript
   import { Strategy } from "@truffle/supplier";

   import { Results } from "./types";

   export namespace RemoteSoljson {
     export type Specification = {
       constructor: {
         options: { strategy: "remote-soljson" };
       };
       results: Results.Specification;
       allowsLoadingSpecificVersion: true;
       allowsListingVersions: true;
     };
   }

   export class RemoteSoljson implements Strategy<RemoteSoljson.Specification> {
     allowsLoadingSpecificVersion() {
       return true;
     }

     allowsListingVersions() {
       return true;
     }

     async load(_version?: string) {
       return { compile: (): any => null };
     }

     async list(): Promise<string[]> {
       return [];
     }
   }
   ```

   </details>
   </p>

3. Connect everything:

   <p>
   <details>
   <summary>See example supplier</summary>

   ```typescript
   import { Supplier, forDefinition } from "@truffle/supplier";

   import { Results } from "./types";
   import { RemoteSoljson } from "./remote-soljson";

   export type Specification = {
     results: Results.Specification;
     options: {};
     strategies: {
       "remote-soljson": RemoteSoljson.Specification;
     };
   };

   export const definition: Supplier.Definition<Specification> = {
     determineStrategy({ strategy }) {
       return strategy;
     },

     strategyConstructors: {
       "remote-soljson": RemoteSoljson
     }
   };

   export const createCompilerSupplier = forDefinition(definition);
   ```

   </details>
   </p>
