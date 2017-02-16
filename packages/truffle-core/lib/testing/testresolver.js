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

  // Remember: This throws if not found.
  var result = this.resolver.require(import_path, this.search_path);

  this.require_cache[import_path] = result;

  return result;
};

TestResolver.prototype.resolve = function(import_path, imported_from, callback) {
  var self = this;
  this.source.resolve(import_path, function(err, result, resolved_path) {
    if (err) return callback(err);
    if (result) return callback(null, result, resolved_path);

    self.resolver.resolve(import_path, imported_from, callback);
  });
};

module.exports = TestResolver;
