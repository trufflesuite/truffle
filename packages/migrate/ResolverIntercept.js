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

    // Note, will error if nothing is found.
    const resolved = this.resolver.require(sanitizedContractName);

    this.cache.push(resolved);

    return resolved;
  }

  contracts() {
    return this.cache;
  }
}

module.exports = ResolverIntercept;
