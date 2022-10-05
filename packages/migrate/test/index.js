const Migrate = require("../index");
const Config = require("@truffle/config");
const assert = require("assert");
const sinon = require("sinon");
let options, migrations;

describe("Migrate", () => {
  before(() => {
    options = Config.default().with({
      provider: "da fake provider yo",
      artifactor: "da fake artifactor yo",
      resolver: "da fake resolver yo",
      network: "fake network",
      network_id: "this is also fake",
      from: "Russia with love"
    });
  });

  describe("Migrate.run(options)", () => {
    describe("when reset is set to true", () => {
      before(() => {
        options.reset = true;
      });

      beforeEach(() => {
        sinon.stub(Migrate, "runAll");
      });
      afterEach(() => {
        Migrate.runAll.restore();
      });

      it("calls runAll then the callback", async function () {
        await Migrate.run(options);
        assert(Migrate.runAll.calledWith(options));
      });
    });

    describe("when reset is not true", function () {
      beforeEach(() => {
        options.reset = undefined;
        sinon
          .stub(Migrate, "lastCompletedMigration")
          .returns(Promise.resolve(666));
        sinon.stub(Migrate, "runFrom");
      });
      afterEach(() => {
        Migrate.lastCompletedMigration.restore();
        Migrate.runFrom.restore();
      });

      it("calls runFrom with the proper migration number", async function () {
        await Migrate.run(options);
        assert(Migrate.runFrom.calledWith(667));
      });
    });
  });

  describe("runMigrations(migrations, options)", function () {
    beforeEach(() => {
      sinon.stub(Migrate, "wrapResolver");
      migrations = [
        {
          run: () => {
            return Promise.resolve();
          }
        }
      ];
    });
    afterEach(() => {
      Migrate.wrapResolver.restore();
    });

    it("calls wrapResolver with the resolver and the wrapped provider", async function () {
      await Migrate.runMigrations(migrations, options);
      assert(
        Migrate.wrapResolver.calledWith(options.resolver, options.provider)
      );
    });

    describe("when an error occurs in a migration", function () {
      beforeEach(() => {
        migrations = [
          {
            run: () => {
              return Promise.reject(new Error("Somethin bad!"));
            }
          }
        ];
      });

      it("returns a resolved Promise after running migrations", async function () {
        try {
          await Migrate.runMigrations(migrations, options);
          assert(false, "This code should not run");
        } catch (error) {
          assert(error.message === "Somethin bad!");
        }
      });
    });
  });
});
