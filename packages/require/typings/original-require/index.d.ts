declare module "original-require" {
  interface ResolveOptions {
    paths?: string[];
  }

  function require(id: string): any;
  function resolve(id: string, options?: ResolveOptions): string;
  function paths(id: string): string[];

  resolve.paths = paths;
  require.resolve = resolve;

  export = require;
}
