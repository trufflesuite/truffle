const path = require("path");

function ResolverIntercept(resolver) {
  this.resolver = resolver;
  this.cache = {};
};

ResolverIntercept.prototype.require = function(import_path) {
  // Modify import_path so the cache key is consistently the same irrespective
  // of whether a user explicated .sol extension
  import_path = import_path.replace(/\.sol$/i, '');

  // TODO: Using the import path for relative files may result in multiple
  // paths for the same file. This could return different objects since it won't be a cache hit.
  if (this.cache[import_path]) {
    return this.cache[import_path];
  }

  // Note, will error if nothing is found.
  var resolved = this.resolver.require(import_path);

  this.cache[import_path] = resolved;

  // During migrations, we could be on a network that takes a long time to accept
  // transactions (i.e., contract deployment close to block size). Because successful
  // migration is more important than wait time in those cases, we'll synchronize "forever".
  resolved.synchronization_timeout = 0;

  return resolved;
};

ResolverIntercept.prototype.contracts = function() {
  var self = this;
  return Object.keys(this.cache).map(function(key) {
    return self.cache[key];
  });
};

module.exports = ResolverIntercept;
