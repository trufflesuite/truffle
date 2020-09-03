const path = require("path");

module.exports = class TestResolver {
  constructor(resolver, source, searchPath) {
    this.resolver = resolver;
    this.source = source;
    this.searchPath = searchPath;

    this.seen = [];
    this.require_cache = {};
    this.cache_on = true;
  }

  require(import_path) {
    if (this.cache_on && this.require_cache[import_path]) {
      return this.require_cache[import_path];
    }

    // For Windows: Allow import paths to be either path separator ('\' or '/')
    // by converting all '/' to the default (path.sep);
    import_path = import_path.replace(/\//g, path.sep);

    // Remember: This throws if not found.
    var result = this.resolver.require(import_path, this.searchPath);

    this.require_cache[import_path] = result;

    return result;
  }

  async resolve(importPath, importedFrom) {
    const result = await this.source.resolve(importPath);
    if (result && result.body) {
      return result;
    }

    return await this.resolver.resolve(importPath, importedFrom);
  }
};
