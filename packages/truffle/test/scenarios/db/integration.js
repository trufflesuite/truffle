const path = require("path");
const Db = require("@truffle/db");
const { assert } = require("chai");
const CommandRunner = require("../commandRunner");
const Ganache = require("ganache");
const sandbox = require("../sandbox");
const gql = require("graphql-tag");
let config, project, server1, server2;

describe("truffle db", function () {
  before(async function () {
    this.timeout(60000);
    const projectPath = path.join(__dirname, "..", "..", "sources", "db");
    config = await sandbox.create(projectPath);
    // only start Ganache if we're not running the Geth tests
    if (!process.env.GETH) {
      server1 = await Ganache.server({
        logging: {
          quiet: true
        }
      });
      server2 = await Ganache.server({
        logging: {
          quiet: true
        }
      });
      await server1.listen(8545);
      await server2.listen(9545);
    }
    await CommandRunner.run("migrate --network network1 --quiet", config);
    await CommandRunner.run("migrate --network network2 --quiet", config);
    const db = Db.connect(config.db);
    project = await Db.Project.initialize({
      project: {
        directory: config.working_directory
      },
      db
    });
  });

  after(async function () {
    if (!process.env.GETH) {
      await server1.close();
      await server2.close();
    }
  });

  it("creates a project", async function () {
    const projects = await project.run(
      Db.Process.resources.all,
      "projects",
      gql`
        fragment myProject on Project {
          directory
        }
      `
    );
    assert(projects.length === 1);
    assert(projects[0].directory === config.working_directory);
  });

  it("can retrieve saved compilations", async function () {
    const compilations = await project.run(
      Db.Process.resources.all,
      "compilations",
      gql`
        fragment myCompilation on Compilation {
          id
          compiler {
            name
          }
        }
      `
    );
    assert.equal(compilations.length, 2);
    const compilerNames = compilations.map(({ compiler: { name } }) => name);
    assert(compilerNames.some(name => name === "solc"));
    assert(compilerNames.some(name => name === "vyper"));
  });

  it("creates contract records", async function () {
    const contracts = await project.run(
      Db.Process.resources.all,
      "contracts",
      gql`
        fragment contractName on Contract {
          id
          name
        }
      `
    );
    assert.equal(contracts.length, 4);
  });

  it("loads contract sources", async function () {
    const sources = await project.run(
      Db.Process.resources.all,
      "sources",
      gql`
        fragment mySource on Source {
          id
          contents
          sourcePath
        }
      `
    );
    for (const source of sources) {
      assert.ok(source.contents);
      assert.ok(source.sourcePath);
    }
  });

  it("loads bytecodes", async function () {
    const bytecodes = await project.run(
      Db.Process.resources.all,
      "bytecodes",
      gql`
        fragment myBytecode on Bytecode {
          id
          bytes
          linkReferences {
            offsets
            name
            length
          }
        }
      `
    );
    assert.equal(
      bytecodes.length,
      8,
      "there should be 8 bytecodes, a create bytecode and a call bytecode per contract"
    );
  });
});
