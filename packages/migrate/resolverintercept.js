class ResolverIntercept {
  constructor(resolver) {
    this.resolver = resolver;
    this.cache = [];
  }

  require(contractName) {
    // remove file extension if present on name
    const sanitizedContractName = contractName
      .replace(/^\.\//, "")
      .replace(/\.sol$/i, "");

    // TODO: Using the import path for relative files may result in multiple
    // paths for the same file. This could return different objects since it won't be a cache hit.
    for (const contract of this.cache) {
      if (contract.contract_name === sanitizedContractName) {
        return contract;
      }
    }

    // Note, will error if nothing is found.
    const resolved = this.resolver.require(sanitizedContractName);

    this.cache.push(resolved);

    // During migrations, we could be on a network that takes a long time to accept
    // transactions (i.e., contract deployment close to block size). Because successful
    // migration is more important than wait time in those cases, we'll synchronize "forever".
    resolved.synchronization_timeout = 0;

    return resolved;
  }

  contracts() {
    return this.cache;
  }
}

module.exports = ResolverIntercept;
