const Config = require("truffle-config");
const Web3 = require("web3");
const TruffleResolver = require("truffle-resolver");
const assert = require("assert");
const Ganache = require("ganache-core");
const ENS = require("../ens");
const path = require("path");
const sinon = require("sinon");
const HDWalletProvider = require("truffle-hdwallet-provider");
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
  registryArtifact;

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
    sinon
      .stub(options.resolver.sources[3], "require")
      .withArgs("@ensdomains/ens/ENSRegistry")
      .returns(registryArtifact);
    ens = new ENS(options);
    fromAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  });
  afterEach(() => {
    options.resolver.sources[3].require.restore();
  });

  describe("deployNewENSRegistry", () => {
    it("deploys a new registry and returns valid addresses", async () => {
      let {
        registryOwnerAddress,
        registryAddress
      } = await ens.deployNewENSRegistry(fromAddress);
      assert(Web3.utils.isAddress(registryOwnerAddress));
      assert(Web3.utils.isAddress(registryAddress));
    });
    it("deploys a new registry and returns non 0x0 addresses", async () => {
      let {
        registryOwnerAddress,
        registryAddress
      } = await ens.deployNewENSRegistry(fromAddress);
      assert(registryAddress !== "0x0000000000000000000000000000000000000000");
      assert(
        registryOwnerAddress !== "0x0000000000000000000000000000000000000000"
      );
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
          await ens.register(addressToSet, "namezzz", fromAddress);
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
    // describe("when there is a registry deployed", () => {
    //   it("registers a name and sets the resolver", () => {
    //
    //   });
    // });
  });
});
