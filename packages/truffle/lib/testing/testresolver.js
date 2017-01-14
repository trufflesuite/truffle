function TestResolver(resolver, source) {
  this.resolver = resolver;
  this.source = source;

  this.seen = [];
  this.require_cache = {};
}

TestResolver.prototype.require = function(import_path, search_path) {
  if (this.require_cache[import_path]) {
    return this.require_cache[import_path];
  }

  // Remember: This throws if not found.
  var result = this.resolver.require(import_path, search_path);

  this.require_cache[import_path] = result;

  return result;
};

TestResolver.prototype.resolve = function(import_path, imported_from, callback) {
  var self = this;
  this.source.resolve(import_path, function(err, result) {
    if (err) return callback(err);
    if (result) return callback(null, result);

    self.resolver.resolve(import_path, imported_from, callback);
  });
};

module.exports = TestResolver;
