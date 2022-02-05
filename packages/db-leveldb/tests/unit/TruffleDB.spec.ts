import { TruffleDB } from "../../src";
import { expect } from "chai";

const os = require("os");

describe("TruffleDB", () => {
  let db: TruffleDB;
  const tmpDirectory: string = os.tmpdir();

  let testConfig = {
    databaseName: "testproject",
    databaseEngine: "memory",
    databaseDirectory: tmpDirectory,
    modelDirectories: []
  };

  describe("Instantiation", () => {
    it("instantiates with default config", async () => {
      db = new TruffleDB();
      expect(db.config).to.eql(TruffleDB.DEFAULTS);
      await db.close();
    });
    it("instantiates with a custom config", async () => {
      db = new TruffleDB(testConfig);
      expect(db.config).to.eql(testConfig);
      await db.close();
    });
    it("attaches db models to itself", () => {
      db = new TruffleDB();
      const { Project } = db.models;

      expect(typeof Project === "function").to.equal(true);
    });
  });
});
