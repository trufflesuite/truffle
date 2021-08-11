export namespace Results {
  export type Specification = {
    load: any;
    list: any;
  };

  export type Load<S extends Specification> = S["load"];
  export type List<S extends Specification> = S["list"];
}
