const Migrate = require("../index");
const Config = require("@truffle/config");
const assert = require("assert");
const sinon = require("sinon");
const fs = require("fs");
let options, migrations;

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
          .returns(Promise.resolve(666));
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

  describe("assemble(options)", () => {
    before(() => {
      sinon.stub(process, "emitWarning");
      sinon.stub(fs, "existsSync").returns(true);
      sinon.stub(fs, "statSync").returns({ isFile: () => true });
      sinon.stub(Config, "detect").returns({
        migrations_directory: "./",
        migrations_file_extension_regexp: /js$/
      });
    });
    it("shouldn't emit a warning when all files have a number at the beginning of the file name", () => {
      sinon.stub(fs, "readdirSync").returns(["1_file.js", "3file.js"]);
      Migrate.assemble({});
      assert(!process.emitWarning.called);
      fs.readdirSync.restore();
    });
    it("shouldn't emit a warning if the file doesn't start with a number but the extension doesn't match the regex", () => {
      sinon.stub(fs, "readdirSync").returns(["file.sol", "file.ts"]);
      Migrate.assemble({});
      assert(!process.emitWarning.called);
      fs.readdirSync.restore();
    });
    it("should emit a warning whenever a file doesn't have a number at the beginning of the file name", () => {
      sinon.stub(fs, "readdirSync").returns(["file.js", "file2.js"]);
      Migrate.assemble({});
      assert(process.emitWarning.called);
      fs.readdirSync.restore();
    });
  });

  describe("runMigrations(migrations, options)", () => {
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

    it("calls wrapResolver with the resolver and the wrapped provider", done => {
      Migrate.runMigrations(migrations, options)
        .then(() => {
          assert(
            Migrate.wrapResolver.calledWith(options.resolver, options.provider)
          );
          done();
        })
        .catch(done);
    });
    describe("when an error occurs in a migration", () => {
      beforeEach(() => {
        migrations = [
          {
            run: () => {
              return Promise.reject(new Error("Somethin bad!"));
            }
          }
        ];
      });

      it("returns a resolved Promise after running migrations", done => {
        Migrate.runMigrations(migrations, options)
          .then(() => {
            assert(false, "This code should not run");
            done();
          })
          .catch(error => {
            assert(error.message === "Somethin bad!");
            done();
          });
      });
    });
  });
});
