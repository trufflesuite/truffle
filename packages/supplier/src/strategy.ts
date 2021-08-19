import type { Constructor as FreeConstructor } from "./constructor";
import type { Results as FreeResults } from "./results";

/**
 * An object of type Strategy<S> provides version loading and possibly version
 * listing functionality
 *
 * Note that a valid Strategy.Specification must include `true` or `false` for
 * `allowsLoadingSpecificVersion` and `allowsListingVersions` types, otherwise
 * Strategy<S> may not be well-formed. These types are used as flags to
 * determine the correct method signatures for the strategy.
 */
export type Strategy<S extends Strategy.Specification> = BaseStrategy<S> &
  (true extends Strategy.AllowsLoadingSpecificVersion<S>
    ? Strategy.SpecificVersionLoader<S>
    : Strategy.BaseLoader<S>) &
  (true extends Strategy.AllowsListingVersions<S> ? Strategy.Lister<S> : {});

/**
 * An object of BaseStrategy<S> allows loading an unspecified version, plus
 * type guards to determine additional functionality
 */
export interface BaseStrategy<S extends Strategy.Specification>
  extends Strategy.BaseLoader<S> {
  allowsLoadingSpecificVersion(): this is this &
    Strategy.SpecificVersionLoader<S>;
  allowsListingVersions(): this is this & Strategy.Lister<S>;
}

export namespace Strategy {
  /**
   * Type-level description of a supplier strategy
   */
  export type Specification = {
    /**
     * A strategy specification includes a constructor specification, minus
     * the constructor specification's `result` property, since this module
     * will inherently deal in constructors that result in an instance of
     * the specified Strategy.
     */
    constructor: Omit<FreeConstructor.Specification, "result">;

    /**
     * A strategy specification includes a `results` specification,
     * defining the types returned for `load()` and `list()` methods.
     */
    results: FreeResults.Specification;

    /**
     * A strategy specifies whether it allows loading specific versions.
     *
     * When specifying a strategy, this must be `true` or `false` explicitly.
     */
    allowsLoadingSpecificVersion: boolean;

    /**
     * A strategy specifies whether it allows listing versions.
     *
     * When specifying a strategy, this must be `true` or `false` explicitly.
     */
    allowsListingVersions: boolean;
  };

  /**
   * Type representing a constructor for specified strategy.
   *
   * This re-exports from the constructor module to use Strategy.Specification
   * as root.
   */
  export type Constructor<S extends Strategy.Specification> = FreeConstructor<
    Strategy.Constructor.Specification<S>
  >;

  /**
   * Scoped re-exports of Constructor, using Strategy.Specification as
   * generic param
   */
  export namespace Constructor {
    /**
     * Type-level specification of the constructor for a given strategy;
     *
     * Constructor `options` are taken as specified for the strategy, using
     * an instance of the specified strategy as the result specification.
     */
    export type Specification<
      S extends Strategy.Specification
    > = S["constructor"] & { result: Strategy<S> };

    /**
     * Type representing the `options` argument for constructing the specified
     * strategy.
     *
     * This re-exports from the constructor module to use
     * Strategy.Specification as the root.
     */
    export type Options<
      S extends Strategy.Specification
    > = FreeConstructor.Options<Strategy.Constructor.Specification<S>>;
  }

  /**
   * Results types for a particular strategy
   */
  export namespace Results {
    /**
     * Type-level specification of method results for specified strategy
     */
    export type Specification<S extends Strategy.Specification> = S["results"];

    /**
     * Type returned by the strategy's `load()` method.
     *
     * This re-exports from the results module to use Strategy.Specification
     * as the root.
     */
    export type Load<S extends Strategy.Specification> = FreeResults.Load<
      Strategy.Results.Specification<S>
    >;

    /**
     * Type returned by the strategy's `list()` method.
     *
     * This re-exports from the results module to use Strategy.Specification
     * as the root.
     */
    export type List<S extends Strategy.Specification> = FreeResults.List<
      Strategy.Results.Specification<S>
    >;
  }

  /**
   * Whether the specified strategy allows loading specific versions.
   *
   * For a well-specified strategy, this will always be the type literal
   * `true` or `false` (never the generalized `boolean`)
   */
  export type AllowsLoadingSpecificVersion<
    S extends Strategy.Specification
  > = S["allowsLoadingSpecificVersion"];

  /**
   * Whether the specified strategy allows listing known versions.
   *
   * For a well-specified strategy, this will always be the type literal
   * `true` or `false` (never the generalized `boolean`)
   */
  export type AllowsListingVersions<
    S extends Strategy.Specification
  > = S["allowsListingVersions"];

  /**
   * An object adhering to the BaseLoader interface provides the `load()`
   * method.
   *
   * This type is used in the construction of the root Strategy type.
   */
  export interface BaseLoader<S extends Strategy.Specification> {
    load(): Strategy.Results.Load<S>;
  }

  /**
   * An object adhering to the SpecificVersionLoader interface provides the
   * `load(version?: string)` method
   *
   * This type is used in the construction of the root Strategy type.
   */
  export interface SpecificVersionLoader<S extends Strategy.Specification> {
    load(version?: string): Strategy.Results.Load<S>;
  }

  /**
   * An object adhering to the Lister interface provides the `list()` method
   *
   * This type is used in the construction of the root Strategy type.
   */
  export interface Lister<S extends Strategy.Specification> {
    list(): Strategy.Results.List<S>;
  }
}
