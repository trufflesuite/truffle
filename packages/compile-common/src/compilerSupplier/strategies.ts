import type { Results } from "./results";

type ResultsSpecification = Results.Specification;
type ResultsLoad<S extends ResultsSpecification> = Results.Load<S>;
type ResultsList<S extends ResultsSpecification> = Results.List<S>;

export namespace Strategy {
  export type Specification = {
    results: ResultsSpecification;
    constructor: Constructor.Specification;
    allowsLoadingSpecificVersion: boolean;
    allowsListingVersions: boolean;
  };

  export namespace Results {
    export type Load<S extends Strategy.Specification> = ResultsLoad<
      S["results"]
    >;

    export type List<S extends Strategy.Specification> = ResultsList<
      S["results"]
    >;
  }

  export type AllowsLoadingSpecificVersion<
    S extends Specification
  > = S["allowsLoadingSpecificVersion"];

  export type AllowsListingVersions<
    S extends Specification
  > = S["allowsListingVersions"];

  export namespace Constructor {
    export type Specification = {
      options: any;
    };

    export type Options<S extends Specification> = S["options"];
  }

  export type Constructor<S extends Specification> = new (
    options: Constructor.Options<S["constructor"]>
  ) => Strategy<S>;
}

export type Strategy<S extends Strategy.Specification> = UnknownStrategy<S> &
  (true extends Strategy.AllowsLoadingSpecificVersion<S>
    ? {
        load(version?: string): Results.Load<S["results"]>;
      }
    : {
        load(): Results.Load<S["results"]>;
      }) &
  (true extends Strategy.AllowsListingVersions<S>
    ? {
        list(): Results.List<S["results"]>;
      }
    : {});

export interface UnknownStrategy<
  S extends Pick<Strategy.Specification, "results">
> {
  load(): Results.Load<S["results"]>;

  allowsLoadingSpecificVersion(): this is this & {
    load(version?: string): Results.Load<S["results"]>;
  };

  allowsListingVersions(): this is {
    list(): Results.List<S["results"]>;
  };
}
