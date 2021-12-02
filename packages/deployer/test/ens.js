const Web3 = require("web3");
const { sha3 } = Web3.utils;
const assert = require("assert");
const Ganache = require("ganache");
const ENS = require("../ens");
const sinon = require("sinon");
const ENSJS = require("@ensdomains/ensjs").default;

let ganacheOptions,
  options,
  server,
  ens,
  fromAddress,
  provider,
  addressToSet,
  registryAddress,
  ensjs,
  registry;

describe("ENS class", () => {
  before(() => {
    ganacheOptions = {
      mnemonic:
        "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
      total_accounts: 1,
      default_ether_balance: 100
    };
    server = Ganache.server(ganacheOptions);
    server.listen(8545, () => {});
    let providerOptions = Object.assign({}, ganacheOptions, {
      port: "8545",
      host: "127.0.0.1"
    });
    provider = Ganache.provider(providerOptions);
  });
  after(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });
  beforeEach(async () => {
    options = {
      provider,
      ens: {
        enabled: true
      }
    };
    ens = new ENS(options);
    // First address generated from the above mnemonic
    fromAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  });

  describe("deployNewDevENSRegistry", () => {
    it("deploys a new registry and returns the registry object", async () => {
      let result = await ens.deployNewDevENSRegistry(fromAddress);
      assert(Web3.utils.isAddress(result.address));
    });
    it("deploys a new registry which has a non-0x0 address", async () => {
      let result = await ens.deployNewDevENSRegistry(fromAddress);
      assert(result.address !== "0x0000000000000000000000000000000000000000");
    });
  });

  describe("setAddress(name, addressOrContract, from)", () => {
    describe("when there is no registry deployed", () => {
      beforeEach(() => {
        sinon.spy(ens, "deployNewDevENSRegistry");
        addressToSet = "0x1234567890123456789012345678901234567890";
      });
      afterEach(() => {
        ens.deployNewDevENSRegistry.restore();
      });

      it("calls deployNewDevENSRegistry", async () => {
        await ens.setAddress("namezzz", addressToSet, { from: fromAddress });
        assert(ens.deployNewDevENSRegistry.called);
      });
    });
    describe("when there is a registry deployed", () => {
      beforeEach(async () => {
        registry = await ens.deployNewDevENSRegistry(fromAddress);
        registryAddress = registry.address;
        addressToSet = "0x1234567890123456789012345678901234567890";
      });

      describe("when the name is not owned by the from address", async () => {
        it("errors when the name is not owned by the from address", async () => {
          try {
            await ens.setAddress("namezzz", addressToSet, {
              from: fromAddress
            });
          } catch (error) {
            const expectedMessageSnippet = `The default address or address provided in the "from"`;
            assert(error.message.includes(expectedMessageSnippet));
          }
        });
      });

      describe("when the name is owned by the from address", async () => {
        beforeEach(async () => {
          const registryOwnerAddress = await registry.owner("0x0");
          addressToSet = "0x1234567890123456789012345678901234567890";
          await registry.setSubnodeOwner(
            "0x0",
            sha3("namezzz"),
            registryOwnerAddress,
            { from: registryOwnerAddress }
          );
          ensjs = new ENSJS({
            provider,
            ensAddress: registryAddress
          });
        });

        it("sets the resolver to resolve to the proper address", async () => {
          await ens.setAddress("namezzz", addressToSet, { from: fromAddress });
          let resolvedAddress = await ensjs.name("namezzz").getAddress();
          assert(resolvedAddress === addressToSet);
        });
      });
    });
  });

  describe("setNameOwner({ name, from })", () => {
    beforeEach(async () => {
      const registry = await ens.deployNewDevENSRegistry(fromAddress);
      ensjs = new ENSJS({
        provider,
        ensAddress: registry.address
      });
    });

    it("sets the owner of the given domain name", async () => {
      await ens.setNameOwner({ from: fromAddress, name: "my.test.name" });
      const owner = await ensjs.name("my.test.name").getOwner();
      assert(owner === fromAddress);
    });
    it("sets the owner for the intermediary names as well", async () => {
      await ens.setNameOwner({ from: fromAddress, name: "my.test.name" });
      const owner1 = await ensjs.name("name").getOwner();
      const owner2 = await ensjs.name("test.name").getOwner();
      assert(owner1 === fromAddress && owner1 === owner2);
    });
  });
});
