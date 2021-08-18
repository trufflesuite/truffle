/**
 * An object of type Constructor<S> is a JS constructor (or "class") that
 * takes a sole argument (of the specified "options" type), and instantiates
 * a new object in memory (of the specified "result" type).
 */
export type Constructor<S extends Constructor.Specification> = new (
  options: Constructor.Options<S>
) => Constructor.Result<S>;

export namespace Constructor {
  /**
   * Type-level description for a particular constructor
   */
  export type Specification = {
    /**
     * The type of the sole `options` argument passed to the constructor
     */
    options: any;

    /**
     * The type of the object the constructor creates
     */
    result: any;
  };

  /**
   * The `options` type for the specified constructor.
   */
  export type Options<S extends Specification> = S["options"];

  /**
   * The type of the object created by the specified constructor.
   */
  export type Result<S extends Specification> = S["result"];
}
