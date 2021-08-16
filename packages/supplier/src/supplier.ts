import type { Strategy as FreeStrategy, BaseStrategy } from "./strategy";
import type { Results as FreeResults } from "./results";

export namespace Supplier {
  /**
   * Type-level description of a supplier
   */
  export type Specification = {
    options: any;
    results: FreeResults.Specification;
    strategies: {
      [strategyName: string]: Omit<FreeStrategy.Specification, "results">;
    };
  };

  /**
   * Getter type for the options argument passed to the constructor for one of
   * the named strategies for a specified supplier
   */
  export type Options<
    S extends Supplier.Specification,
    N extends Supplier.StrategyName<S>
  > = S["options"] & Supplier.Strategy.Constructor.Options<S, N>;

  export namespace Results {
    /**
     * Type-level specification of method results for specified supplier;
     * used in conjunction with each strategy individually
     */
    export type Specification<S extends Supplier.Specification> = S["results"];
  }

  export namespace Strategies {
    export type Specification<S extends Supplier.Specification> = S["strategies"];
  }

  /**
   * A type representing one of the strategy names for specified supplier
   */
  export type StrategyName<S extends Supplier.Specification> = string &
    keyof Supplier.Strategies.Specification<S>;

  export namespace Strategy {
    /**
     * Type-level specification of one of the named strategies for specified
     * supplier; joins specified supplier results type
     */
    export type Specification<
      S extends Supplier.Specification,
      N extends Supplier.StrategyName<S>
    > = Supplier.Strategies.Specification<S>[N] & {
      results: Supplier.Results.Specification<S>
    };

    export namespace Constructor {
      /**
       * Type-level specification of the constructor for one of the named
       * strategies for a specified supplier
       */
      export type Specification<
        S extends Supplier.Specification,
        N extends Supplier.StrategyName<S>
      > = FreeStrategy.Constructor<Supplier.Strategy.Specification<S, N>>;

      /**
       * Getter type for options argument passed to the constructor for one of
       * the named strategies for a specified supplier
       */
      export type Options<
        S extends Supplier.Specification,
        N extends Supplier.StrategyName<S>
      > = {
        [K in N]: FreeStrategy.Constructor.Options<
          Supplier.Strategy.Specification<S, K>
        >
      }[N];
    }

    /**
     * An object of Constructor<S, N> is a JS constructor (or "class") for one
     * of the named strategies for specified supplier
     */
    export type Constructor<
      S extends Supplier.Specification,
      N extends Supplier.StrategyName<S>
    > = FreeStrategy.Constructor<Supplier.Strategy.Specification<S, N>>;
  }

  /**
   * An object of type Definition<S> comprises constructors for each of the
   * specified strategies, as well as a method to determine the name of which
   * strategy to use for a given set of input options
   */
  export type Definition<S extends Supplier.Specification> = {
    determineStrategy(
      options: Options<S, Supplier.StrategyName<S>>
    ): Supplier.StrategyName<S>;

    strategyConstructors: {
      [N in Supplier.StrategyName<S>]: Supplier.Strategy.Constructor<S, N>;
    };
  };
}

/**
 * An object of type Supplier<S, N> provides an interface for loading and
 * possibly listing versions of the supplied component
 *
 * @dev for known strategy names, this computes the method signature of
 *      `load()` according to the corresponding strategy specification;
 *
 *      for the default of "any strategy name", this type will resolve to an
 *      interface that may require the use of defined type guards
 *      (e.g. `if(supplier.allowsListingVersions()) { supplier.list(); }`)
 */
export type Supplier<
  S extends Supplier.Specification,
  N extends Supplier.StrategyName<S> = Supplier.StrategyName<S>
> = Supplier.StrategyName<S> extends N
  ? BaseStrategy<Supplier.Strategy.Specification<S, N>>
  : FreeStrategy<Supplier.Strategy.Specification<S, N>>;

/**
 * Given the definition of specified supplier, create a function that
 * determines+constructs a supplier strategy for a given set of options.
 */
export const forDefinition = <S extends Supplier.Specification>({
  determineStrategy,
  strategyConstructors
}: Supplier.Definition<S>) => <N extends Supplier.StrategyName<S>>(
  options: Supplier.Strategy.Constructor.Options<S, N>
): Supplier<S, N> => {
  const strategyName = determineStrategy(options);
  const Strategy = strategyConstructors[strategyName];

  // @ts-ignore since we can't figure out N from inside
  const supplier: Supplier<S, N> = new Strategy(options);
  return supplier;
};
