const Migrate = require("../index");
const Config = require("truffle-config");
const assert = require("assert");
const sinon = require("sinon");
let options;

describe("Migrate", () => {
  before(() => {
    options = Config.default().with({
      provider: "da fake provider yo",
      artifactor: "da fake artifactor yo",
      resolver: "da fake resolver yo",
      logger: "crushin it wit a loggerzzz",
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

      it("calls runAll then the callback", done => {
        Migrate.run(options)
          .then(() => {
            assert(Migrate.runAll.calledWith(options));
            done();
          })
          .catch(done);
      });
    });

    describe("when reset is not true", () => {
      beforeEach(() => {
        options.reset = undefined;
        sinon
          .stub(Migrate, "lastCompletedMigration")
          .returns(Promise.resolve(667));
        sinon.stub(Migrate, "runFrom");
      });
      afterEach(() => {
        Migrate.lastCompletedMigration.restore();
        Migrate.runFrom.restore();
      });

      it("calls runFrom with the proper migration number", done => {
        Migrate.run(options)
          .then(() => {
            assert(Migrate.runFrom.calledWith(667));
            done();
          })
          .catch(done);
      });
    });
  });
});
