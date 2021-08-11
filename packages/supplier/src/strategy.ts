import type { Constructor as FreeConstructor } from "./constructor";
import type { Results as FreeResults } from "./results";

export namespace Strategy {
  /**
   * Type-level description of a supplier strategy
   */
  export type Specification = {
    constructor: Omit<FreeConstructor.Specification, "result">;
    results: FreeResults.Specification;
    allowsLoadingSpecificVersion: boolean;
    allowsListingVersions: boolean;
  };

  /**
   * Scoped re-exports of Constructor, using Strategy.Specification as
   * generic param
   */
  export namespace Constructor {
    /**
     * Getter for the specified constructor, intersected with fixed result
     * type of Strategy<S>
     */
    export type Specification<S extends Strategy.Specification> =
      S["constructor"] & { result: Strategy<S>; };

    /**
     * Constructor options argument for a specified strategy
     */
    export type Options<S extends Strategy.Specification> = FreeConstructor.Options<
      Strategy.Constructor.Specification<S>
    >;
  }

  /**
   * Type representing a constructor for specified strategy
   */
  export type Constructor<S extends Strategy.Specification> = FreeConstructor<
    Strategy.Constructor.Specification<S>
  >;

  /**
   * Results types for a particular strategy
   */
  export namespace Results {
    export type Specification<S extends Strategy.Specification> =
      S["results"];

    export type Load<S extends Strategy.Specification> = FreeResults.Load<
      Strategy.Results.Specification<S>
    >;

    export type List<S extends Strategy.Specification> = FreeResults.List<
      Strategy.Results.Specification<S>
    >;
  }

  /**
   * Getter type for whether specified strategy allows argument to load()
   */
  export type AllowsLoadingSpecificVersion<
    S extends Strategy.Specification
  > = S["allowsLoadingSpecificVersion"];

  /**
   * Getter type for whether specified strategy provides version listing
   */
  export type AllowsListingVersions<
    S extends Strategy.Specification
  > = S["allowsListingVersions"];

}

/**
 * An object of type Strategy<S> provides version loading and possibly version
 * listing functionality
 */
export type Strategy<S extends Strategy.Specification> = BaseStrategy<S> &
  (true extends Strategy.AllowsLoadingSpecificVersion<S>
    ? {
        load(version?: string): Strategy.Results.Load<S>;
      }
    : {
        load(): Strategy.Results.Load<S>;
      }) &
  (true extends Strategy.AllowsListingVersions<S>
    ? {
        list(): Strategy.Results.List<S>;
      }
    : {});

/**
 * An object of BaseStrategy<S> allows loading an unspecified version, plus
 * type guards to determine additional functionality
 */
export interface BaseStrategy<S extends Strategy.Specification> {
  load(): Strategy.Results.Load<S>;

  allowsLoadingSpecificVersion(): this is this & {
    load(version?: string): Strategy.Results.Load<S>;
  };

  allowsListingVersions(): this is {
    list(): Strategy.Results.List<S>;
  };
}
