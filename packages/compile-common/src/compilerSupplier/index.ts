export { Results } from "./results";
export { Strategy, UnknownStrategy } from "./strategies";
export { Supplier, forDefinition } from "./supplier";

// /**
//  * All the input/output types relevant to a particular language's
//  * CompilerSupplier
//  */
// export type Specification = {
//   constructor: {
//     options: any;
//   };

//   load: {
//     options: any;
//     result: any;
//   }

//   list: {
//     options: any;
//     result: any;
//   };

//   loadingStrategies: {
//     [loadingStrategyName: string]: {
//       options: any;
//     }
//   }
// };

// /*
//  * constructor
//  */

// type ConstructorSpecification<S extends Specification> = S["constructor"];

// /**
//  * Constructing a CompilerSupplier requires the common options for the spec,
//  * as well as the options dictated by at least one of the loading strategies
//  */
// export type ConstructorOptions<
//   S extends Specification
// > = ConstructorSpecification<S>["options"];

// /**
//  * A CompilerSupplier constructor is generic to a particular loading strategy
//  *
//  * @param options - Valid options must include all common constructor options,
//  *                  as well as the options for that loading strategy
//  */
// export type Constructor<
//   S extends Specification
// > = new <N extends LoadingStrategyName<S>>(
//   options: ConstructorOptions<S> & LoadingStrategyConstructorOptions<S, N>
// ) => CompilerSupplier<S>;

// /*
//  * CompilerSupplier itself
//  */

// export interface CompilerSupplier<S extends Specification> {
//   load(options: LoadOptions<S>): Promise<LoadResult<S>>;
//   list(options: ListOptions<S>): Promise<ListResult<S>>;
// }

// /*
//  * load
//  */

// type LoadSpecification<S extends Specification> = S["load"];

// export type LoadOptions<
//   S extends Specification
// > = LoadSpecification<S>["options"];

// export type LoadResult<
//   S extends Specification
// > = LoadSpecification<S>["result"];

// /*
//  * list
//  */

// type ListSpecification<S extends Specification> = S["list"];

// export type ListOptions<
//   S extends Specification
// > = ListSpecification<S>["options"];

// export type ListResult<
//   S extends Specification
// > = ListSpecification<S>["result"];

// /*
//  * loadingStrategies
//  */

// type LoadingStrategiesSpecification<
//   S extends Specification
// > = S["loadingStrategies"];

// type LoadingStrategyName<
//   S extends Specification
// > = string & keyof LoadingStrategiesSpecification<S>;

// type LoadingStrategySpecification<
//   S extends Specification,
//   N extends LoadingStrategyName<S>
// > = LoadingStrategiesSpecification<S>[N];

// type LoadingStrategyConstructorOptions<
//   S extends Specification,
//   N extends LoadingStrategyName<S>
// > = LoadingStrategySpecification<S, N>["options"];

// type LoadingStrategyConstructor<
//   S extends Specification,
//   N extends LoadingStrategyName<S>
// > = new (
//   options: LoadingStrategyConstructorOptions<S, N>
// ) => LoadingStrategy<S>;

// export interface LoadingStrategy<S extends Specification> {
//   load(options: LoadOptions<S>): Promise<LoadResult<S>>;
//   list(options: ListOptions<S>): Promise<ListResult<S>>;
// }

// /**
//  * Type representing runtime data necessary for instantiating a particular
//  * language's CompilerSupplier
//  */
// export type Definition<S extends Specification> = {
//   determineStrategy(options: ConstructorOptions<S>): LoadingStrategyName<S>;

//   loadingStrategies: {
//     [N in LoadingStrategyName<S>]: LoadingStrategyConstructor<S, N>;
//   };
// };

// export const forDefinition = <S extends Specification>({
//   determineStrategy,
//   loadingStrategies
// }: Definition<S>): Constructor<S> => {
//   const CompilerSupplier = class implements CompilerSupplier<S> {
//     private strategy: LoadingStrategy<S>;

//     constructor(
//       options:
//         & ConstructorOptions<S>
//         & LoadingStrategyConstructorOptions<S, LoadingStrategyName<S>>
//     ) {
//       const strategyName = determineStrategy(options);
//       const LoadingStrategy = loadingStrategies[strategyName];
//       this.strategy = new LoadingStrategy(options);
//     }

//     async load(options: LoadOptions<S>) {
//       return await this.strategy.load(options);
//     }

//     async list(options: ListOptions<S>) {
//       return await this.strategy.list(options);
//     }
//   };

//   return CompilerSupplier;
// };
