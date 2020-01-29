const path = require("path");

function TestResolver(resolver, source, search_path) {
  this.resolver = resolver;
  this.source = source;
  this.search_path = search_path;

  this.seen = [];
  this.require_cache = {};
  this.cache_on = true;
}

TestResolver.prototype.require = function(import_path) {
  if (this.cache_on && this.require_cache[import_path]) {
    return this.require_cache[import_path];
  }

  // For Windows: Allow import paths to be either path separator ('\' or '/')
  // by converting all '/' to the default (path.sep);
  import_path = import_path.replace(/\//g, path.sep);

  // Remember: This throws if not found.
  var result = this.resolver.require(import_path, this.search_path);

  this.require_cache[import_path] = result;

  return result;
};

TestResolver.prototype.resolve = function(
  importPath,
  importedFrom,
  callback
) {
  var self = this;
  this.source.resolve(importPath)
    .then(result => {
      if (result && result.body) return callback(null, result.body, result.resolvedPath);
      self.resolver.resolve(importPath, importedFrom, callback);
    })
    .catch(callback);
};

module.exports = TestResolver;
