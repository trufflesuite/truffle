export namespace Constructor {
  /**
   * Type-level description for a particular constructor
   */
  export type Specification = {
    /**
     * Options argument for specified constructor
     */
    options: any;

    /**
     * Output object created by specified constructor
     */
    result: any;
  };

  /**
   * Getter type for constructor arg
   */
  export type Options<S extends Specification> = S["options"];

  /**
   * Getter type for constructed object
   */
  export type Result<S extends Specification> = S["result"];
}

/**
 * An object of type Constructor<S> is a JS constructor (or "class") that
 * takes a sole argument (of the specified "options" type), and instantiates
 * a new object in memory (of the specified "result" type).
 */
export type Constructor<S extends Constructor.Specification> = new (
  options: Constructor.Options<S>
) => Constructor.Result<S>;
