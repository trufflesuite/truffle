import Context from "./context";

/**
 * Indexed container collection of Contexts
 * Each Context is indexed by its binary and its associated addresses
 */
export default class ContextSet {
  constructor(...contexts) {
    // initialize empty
    this.contexts = [];
    this.indexForAddress = {};
    this.indexForBinary = {};

    // procedurally add
    this.add(...contexts);
  };

  static forContracts(...contracts) {
    let contexts = [];

    for (let contract of contracts) {
      // create Context for binary and deployed binary
      contexts.push(new Context(contract.binary, {
        sourceMap: contract.sourceMap,
        source: contract.source,
        sourePath: contract.sourcePath,
        contractName: contract.contractName
      }));
      contexts.push(new Context(contract.deployedBinary, {
        sourceMap: contract.deployedSourceMap,
        source: contract.source,
        sourePath: contract.sourcePath,
        contractName: contract.contractName
      }));
    }

    return new ContextSet(...contexts);
  }

  /**
   * Retrieve context for code at a given address
   */
  contextForAddress(address) {
    let index = this.indexForAddress[address];
    return this.contexts[index];
  }

  /**
   * Address -> Contract mapping
   */
  addressedContracts() {
    let map = {};

    for (let address of Object.keys(this.indexForAddress)) {
      let index = this.indexForAddress[address];
      let context = this.contexts[index];

      map[address] = {
        contractName: context.contractName,
        source: context.source,
        binary: context.binary
      };
    }

    return map;
  }


  /**
   * Retrieve context with a given binary
   */
  contextForBinary(binary) {
    let index = this.indexForBinary[binary];
    return this.contexts[index];
  }

  /**
   * Add contexts to the set
   *
   * Merges with existing contexts
   */
  add(...contexts) {
    for (let context of contexts) {
      this.addContext(context);
    }
  };


  /**
   * Add Context
   *
   * If Context already exists in set, merges Context data with existing
   */
  addContext(context) {
    var self = this;
    var index;

    if (this.indexForBinary[context.binary] != undefined) {
      index = this.indexForBinary[context.binary];
      context = context.merge(this.contexts[index]);
    } else {
      index = this.contexts.length;
      this.indexForBinary[context.binary] = index;
    }

    this.contexts[index] = context;

    for (let address of context.addresses) {
      this.indexForAddress[address] = index;
    }
  }

  /**
   * Return a new ContextSet with the merged Contexts of this and another
   */
  merge(other) {
    return new ContextSet([...this.contexts, ...other.contexts]);
  }
}
