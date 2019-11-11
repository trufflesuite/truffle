const ENSJS = require("ethereum-ens");
const contract = require("@truffle/contract");
const sha3 = require("web3").utils.sha3;
const { hash } = require("eth-ens-namehash");

class ENS {
  constructor({ provider, ensSettings }) {
    this.ensSettings = ensSettings;
    this.provider = provider;
    this.devRegistry = null;
  }

  determineENSRegistryAddress() {
    if (this.ensSettings.registryAddress) {
      return this.ensSettings.registryAddress;
    } else if (
      this.ensjs &&
      this.ensjs.registryPromise._rejectionHandler0._address
    ) {
      return this.ensjs.registryPromise._rejectionHandler0._address;
    } else {
      const message =
        `Truffle could not locate the address of the ENS ` +
        `registry for the network you are using. You must either be on a` +
        `known network or a development blockchain.`;
      throw new Error(message);
    }
  }

  async deployNewDevENSRegistry(from) {
    const ENSRegistryArtifact = require("@ensdomains/ens").ENSRegistry;
    const ENSRegistry = contract(ENSRegistryArtifact);
    ENSRegistry.setProvider(this.provider);
    const ensRegistry = await ENSRegistry.new({ from });
    this.ensSettings.registryAddress = ensRegistry.address;
    this.devRegistry = ensRegistry;
    this.setENSJS();
    return ensRegistry;
  }

  async ensureRegistryExists(from) {
    // See if registry exists on network by resolving an arbitrary address
    // If no registry exists then deploy one
    try {
      await this.ensjs.owner("0x0");
    } catch (error) {
      const noRegistryFound =
        error.message ===
        "This contract object doesn't have address set yet, please set an address first.";
      if (noRegistryFound) {
        await this.deployNewDevENSRegistry(from);
        this.setENSJS();
      } else {
        throw error;
      }
    }
  }

  async ensureResolverExists({ from, name }) {
    // See if the resolver is set, if not then set it
    let resolvedAddress, publicResolver;
    try {
      resolvedAddress = await this.ensjs.resolver(name).addr();
      return { resolvedAddress };
    } catch (error) {
      if (error.message !== "ENS name not found") throw error;
      const PublicResolverArtifact = require("@ensdomains/resolver")
        .PublicResolver;
      const PublicResolver = contract(PublicResolverArtifact);
      PublicResolver.setProvider(this.provider);

      let registryAddress = this.determineENSRegistryAddress();

      publicResolver = await PublicResolver.new(registryAddress, { from });
      await this.ensjs.setResolver(name, publicResolver.address, { from });
      return { resolvedAddress: null };
    }
  }

  async setAddress(name, addressOrContract, { from }) {
    this.validateSetAddressInputs({ addressOrContract, name, from });
    const address = this.parseAddress(addressOrContract);
    this.setENSJS();
    await this.ensureRegistryExists(from);

    // In the case where there is a registry deployed by the user,
    // set permissions so that the resolver can be set by the user
    if (this.devRegistry) await this.setNameOwner({ from, name });

    // Find the owner of the name and compare it to the "from" field
    const nameOwner = await this.ensjs.owner(name);

    if (nameOwner !== from) {
      const message =
        `The default address or address provided in the "from" ` +
        `field for registering does not own the specified ENS name. The ` +
        `"from" field address must match the owner of the name.` +
        `\n> Failed to register ENS name ${name}` +
        `\n> Address in "from" field - ${from}` +
        `\n> Current owner of '${name}' - ${nameOwner}`;
      throw new Error(message);
    }

    const { resolvedAddress } = await this.ensureResolverExists({ from, name });
    // If the resolver points to a different address or is not set,
    // then set it to the specified address
    if (resolvedAddress !== address) {
      await this.ensjs.resolver(name).setAddr(address);
    }
  }

  async setNameOwner({ name, from }) {
    const nameLabels = name.split(".").reverse();

    // Set top-level name
    let builtName = nameLabels[0];
    await this.devRegistry.setSubnodeOwner("0x0", sha3(builtName), from, {
      from
    });

    // If name is only one label, stop here
    if (nameLabels.length === 1) return;

    for (const label of nameLabels.slice(1)) {
      await this.devRegistry.setSubnodeOwner(
        hash(builtName),
        sha3(label),
        from,
        { from }
      );
      builtName = label.concat(`.${builtName}`);
    }
  }

  parseAddress(addressOrContract) {
    if (typeof addressOrContract === "string") return addressOrContract;
    try {
      return addressOrContract.address;
    } catch (error) {
      const message =
        `You have not entered a valid address or contract ` +
        `object with an address property. Please ensure that you enter a ` +
        `valid address or pass in a valid artifact.`;
      throw new Error(message);
    }
  }

  validateSetAddressInputs({ addressOrContract, name, from }) {
    if (
      !addressOrContract ||
      !name ||
      !from ||
      (typeof addressOrContract !== "string" &&
        typeof addressOrContract !== "object") ||
      typeof name !== "string" ||
      typeof from !== "string"
    ) {
      const message =
        `The 'address', 'name', or 'from' parameter is invalid for ` +
        `the call to the setAddress function. Please ensure that you are ` +
        `passing valid values. The received input values were the ` +
        `following:\n   - address: ${addressOrContract}\n   - name: ${name}\n   - from: ` +
        `${from}\n`;
      throw new Error(message);
    }
  }

  setENSJS() {
    this.ensjs = new ENSJS(this.provider, this.ensSettings.registryAddress);
  }
}

module.exports = ENS;
