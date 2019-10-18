const assert = require("assert");
const Config = require("@truffle/config");
const Migration = require("../migration");
const sinon = require("sinon");
let options,
  prepareForMigrationsReturn,
  fakeAdapter,
  migration,
  context,
  resolver;
let deployer;

describe("Migration", () => {
  before(() => {
    deployer: "da fake deployer yo";
    resolver: "da fake resolver yo",
      (options = Config.default().with({
        provider: "da fake provider yo",
        artifactor: "da fake artifactor yo",
        resolver,
        logger: "crushin it wit a loggerzzz",
        networks: {
          "fake network": {}
        },
        network: "fake network",
        network_id: "this is also fake",
        from: "Russia with love"
      }));
    fakeAdapter = {
      eth: {
        getBlock: sinon.stub().returns({ gasLimit: 2000 })
      }
    };
    context = { web3: fakeAdapter };
    prepareForMigrationsReturn = {
      adapter: fakeAdapter,
      resolver,
      context,
      deployer
    };
    migration = new Migration("fake/file.js", undefined, options);
  });

  describe("run(options)", () => {
    beforeEach(() => {
      sinon
        .stub(migration, "prepareForMigrations")
        .returns(prepareForMigrationsReturn);
      sinon.stub(migration, "_load");
    });
    afterEach(() => {
      migration.prepareForMigrations.restore();
      migration._load.restore();
    });

    it("calls web3.eth.getBlock('latest')", done => {
      migration
        .run(options)
        .then(() => {
          assert(fakeAdapter.eth.getBlock.calledWith("latest"));
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    it("calls _load with the proper arguments", done => {
      migration
        .run(options)
        .then(() => {
          assert(
            migration._load.calledWith(options, context, deployer, resolver)
          );
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });
});
