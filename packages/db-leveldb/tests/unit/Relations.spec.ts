// @ts-nocheck
import { expect } from "chai";
import { Storage } from "../../src/storage";

const os = require("os");

describe("Generate ID", () => {
  const modelDirectories = [`${__dirname}/testModels`];

  const tmpDir = os.tmpdir();
  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let Relationship;
  let Contract;

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName,
      modelDirectories
    });

    levelDB = DB.levelDB;

    Relationship = DB.models.Relationship;
    Contract = DB.models.Contract;
  });
  afterEach(async () => {
    await levelDB.close();
  });

  it("stores other models on itself", async () => {
    const contractCollection = await Relationship.create({ id: 1 });

    const contract1 = await Contract.create({ id: 1, name: "contract1" });
    const contract2 = await Contract.create({ id: 2, name: "contract2" });
    const contract3 = await Contract.create({ id: 3, name: "contract3" });

    contractCollection.addContractByID(contract1.id);
    contractCollection.addContractByID(contract2.id);
    contractCollection.addContractByID(contract3.id);

    const contracts = await contractCollection.getContracts();

    expect(contracts.length).to.equal(3);
  });
});
