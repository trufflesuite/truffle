import type { Strategy, UnknownStrategy } from "./strategies";
import type { Results } from "./results";

type StrategySpecification = Strategy.Specification;
type StrategyConstructor<
  S extends StrategySpecification
> = Strategy.Constructor<S>;

export namespace Supplier {
  export type Specification = {
    options: any;
    results: Results.Specification;
    strategies: {
      [strategyName: string]: Omit<StrategySpecification, "results">;
    };
  };

  export type StrategyName<S extends Specification> = string &
    keyof S["strategies"];

  export type Options<
    S extends Specification,
    N extends StrategyName<S>
  > = S["options"] & Strategy.Constructor.Options<S, N>;

  export namespace Strategy {
    export type Specification<
      S extends Supplier.Specification,
      N extends StrategyName<S>
    > = S["strategies"][N] & Pick<S, "results">;

    export namespace Constructor {
      export type Specification<
        S extends Supplier.Specification,
        N extends StrategyName<S>
      > = Supplier.Strategy.Specification<S, N>["constructor"];

      export type Options<
        S extends Supplier.Specification,
        N extends StrategyName<S>
      > = {
        [K in N]: Specification<S, K>["options"];
      }[N];
    }

    export type Constructor<
      S extends Supplier.Specification,
      N extends StrategyName<S>
    > = StrategyConstructor<Strategy.Specification<S, N>>;
  }

  export type Definition<S extends Specification> = {
    determineStrategy(options: Options<S, StrategyName<S>>): StrategyName<S>;

    strategyConstructors: {
      [N in StrategyName<S>]: Strategy.Constructor<S, N>;
    };
  };
}

export type Supplier<
  S extends Supplier.Specification,
  N extends Supplier.StrategyName<S>
> = Supplier.StrategyName<S> extends N
  ? UnknownStrategy<Supplier.Strategy.Specification<S, N>>
  : Strategy<Supplier.Strategy.Specification<S, N>>;

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
