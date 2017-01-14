function ResolverIntercept(resolver) {
  this.resolver = resolver;
  this.seen = [];
};

ResolverIntercept.prototype.require = function(import_path) {
  // Note, will error if nothing is found.
  var resolved = this.resolver.require(import_path);

  // Use object reference to key the hash, to ensure uniqueness and no duplicates.
  this.seen.push(resolved);

  // During migrations, we could be on a network that takes a long time to accept
  // transactions (i.e., contract deployment close to block size). Because successful
  // migration is more important than wait time in those cases, we'll synchronize "forever".
  resolved.synchronization_timeout = 0;

  return resolved;
};

ResolverIntercept.prototype.contracts = function() {
  return this.seen;
};

module.exports = ResolverIntercept;
