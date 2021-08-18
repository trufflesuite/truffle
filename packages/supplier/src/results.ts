export namespace Results {
  export type Specification = {
    /**
     * When specifying results, the `load` type represents the return value for
     * a `load()` method.
     */
    load: any;

    /**
     * When specifying results, the `load` type represents the return value for
     * a `list()` method.
     */
    list: any;
  };

  /**
   * The type returned by `load()` according to the results specification.
   */
  export type Load<S extends Specification> = S["load"];

  /**
   * The type returned by `list()` according to the results specification.
   */
  export type List<S extends Specification> = S["list"];
}
