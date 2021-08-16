export type Compiler = { compile(): any };

export namespace Results {
  export type Specification = {
    load: Promise<Compiler>;
    list: Promise<string[]>;
  };
}

