const Config = require("truffle-config");
const Web3 = require("web3");
const { sha3 } = Web3.utils;
const TruffleResolver = require("truffle-resolver");
const assert = require("assert");
const Ganache = require("ganache-core");
const ENS = require("../ens");
const path = require("path");
const sinon = require("sinon");
const HDWalletProvider = require("truffle-hdwallet-provider");
const ENSJS = require("ethereum-ens");

let ganacheOptions,
  config,
  options,
  server,
  ens,
  fromAddress,
  provider,
  workingDirectory,
  contractsBuildDirectory,
  addressToSet,
  publicResolverArtifact,
  registryArtifact,
  registryAddress;

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
  });
  after(done => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    }
  });
  beforeEach(() => {
    workingDirectory = path.join(__dirname, "sources", "init");
    contractsBuildDirectory = path.join(workingDirectory, "build", "contracts");
    config = Config.detect({
      working_directory: workingDirectory,
      contracts_build_directory: contractsBuildDirectory
    });
    provider = new HDWalletProvider(
      ganacheOptions.mnemonic,
      "http://localhost:8545"
    );
    options = {
      provider,
      resolver: new TruffleResolver(config)
    };
    registryArtifact = require(path.join(
      contractsBuildDirectory,
      "ENSRegistry.json"
    ));
    publicResolverArtifact = require(path.join(
      contractsBuildDirectory,
      "PublicResolver.json"
    ));
    sinon
      .stub(options.resolver.sources[3], "require")
      .withArgs("@ensdomains/resolver/PublicResolver")
      .returns(publicResolverArtifact)
      .withArgs("@ensdomains/ens/ENSRegistry")
      .returns(registryArtifact);
    ens = new ENS(options);
    fromAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  });
  afterEach(() => {
    options.resolver.sources[3].require.restore();
  });

  describe("deployNewENSRegistry", () => {
    it("deploys a new registry and returns the registry object", async () => {
      let result = await ens.deployNewENSRegistry(fromAddress);
      assert(Web3.utils.isAddress(result.address));
    });
    it("deploys a new registry which has a non-0x0 address", async () => {
      let result = await ens.deployNewENSRegistry(fromAddress);
      assert(result.address !== "0x0000000000000000000000000000000000000000");
    });
  });

  describe("register(address, name, from)", () => {
    describe("when there is no registry deployed", () => {
      beforeEach(() => {
        sinon.spy(ens, "deployNewENSRegistry");
        sinon.stub();
        addressToSet = "0x1234567890123456789012345678901234567890";
      });
      afterEach(() => {
        ens.deployNewENSRegistry.restore();
      });

      it("calls deployNewENSRegistry", async () => {
        try {
          await ens.register({
            address: addressToSet,
            name: "namezzz",
            from: fromAddress
          });
        } catch (error) {
          const expectedMessageSnippet = `The default address or address provided in the "from"`;
          if (error.message.includes(expectedMessageSnippet)) {
            assert(ens.deployNewENSRegistry.called);
          } else {
            throw error;
          }
        }
      });
    });
    describe("when there is a registry deployed", () => {
      beforeEach(async () => {
        let result = await ens.deployNewENSRegistry(fromAddress);
        registryAddress = result.registryAddress;
        addressToSet = "0x1234567890123456789012345678901234567890";
      });

      describe("when the name is not owned by the from address", async () => {
        it("errors when the name is not owned by the from address", async () => {
          try {
            await ens.register({
              address: addressToSet,
              name: "namezzz",
              from: fromAddress,
              registryAddress
            });
          } catch (error) {
            const expectedMessageSnippet = `The default address or address provided in the "from"`;
            assert(error.message.includes(expectedMessageSnippet));
          }
        });
      });

      describe("when the name is owned by the from address", async () => {
        beforeEach(async () => {
          let registry = await ens.deployNewENSRegistry(fromAddress);
          registryOwnerAddress = await registry.owner("0x0");
          registryAddress = registry.address;
          addressToSet = "0x1234567890123456789012345678901234567890";
          await registry.setSubnodeOwner(
            "0x0",
            sha3("namezzz"),
            registryOwnerAddress,
            { from: registryOwnerAddress }
          );
          ensjs = new ENSJS(provider, registryAddress);
        });

        it("sets the resolver to resolve to the proper address", async () => {
          await ens.register({
            address: addressToSet,
            name: "namezzz",
            from: fromAddress,
            registryAddress
          });
          let resolvedAddress = await ensjs.resolver("namezzz").addr();
          assert(resolvedAddress === addressToSet);
        });
      });
    });
  });
});
