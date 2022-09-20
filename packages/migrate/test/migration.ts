import { assert } from "chai";
import Config from "@truffle/config";
import { Migration } from "../src/Migration";
import * as sinon from "sinon";

type FakeInterfaceAdapter = {
  getBlock: any;
};

type Context = {
  interfaceAdapter: FakeInterfaceAdapter;
};

let options: Config,
  prepareForMigrationsReturn: {
    interfaceAdapter: FakeInterfaceAdapter;
    deployer: string;
    resolver: string;
    context: Context;
  },
  fakeInterfaceAdapter: FakeInterfaceAdapter,
  migration: Migration,
  context: Context,
  resolver: string,
  deployer: string;

describe("Migration", function () {
  before(() => {
    deployer = "da fake deployer yo";
    resolver = "da fake resolver yo";
    options = Config.default().with({
      provider: "da fake provider yo",
      artifactor: "da fake artifactor yo",
      resolver,
      networks: {
        "fake network": {}
      },
      network: "fake network",
      network_id: "this is also fake",
      from: "Russia with love"
    });
    fakeInterfaceAdapter = {
      getBlock: sinon.stub().returns({ gasLimit: 2000 })
    };
    context = { interfaceAdapter: fakeInterfaceAdapter };
    prepareForMigrationsReturn = {
      interfaceAdapter: fakeInterfaceAdapter,
      resolver,
      context,
      deployer
    };
    migration = new Migration("fake/file.js", options);
  });

  describe("run(options)", function () {
    beforeEach(function () {
      sinon
        .stub(migration, "prepareForMigrations")
        // @ts-ignore
        .returns(prepareForMigrationsReturn);
      sinon.stub(migration, "_load");
    });
    afterEach(function () {
      // @ts-ignore
      migration.prepareForMigrations.restore();
      // @ts-ignore
      migration._load.restore();
    });

    it("calls interfaceAdapter.getBlock('latest')", async function () {
      await migration.run(options);
      assert(fakeInterfaceAdapter.getBlock.calledWith("latest"));
    });

    it("calls _load with the proper arguments", async function () {
      await migration.run(options);
      // @ts-ignore
      assert(migration._load.calledWith(options, context, deployer, resolver));
    });
  });
});
