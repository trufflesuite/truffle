const path = require("path");
const fs = require("fs/promises");
const Db = require("@truffle/db");
const { assert } = require("chai");
const CommandRunner = require("../commandRunner");
const Ganache = require("ganache");
const sandbox = require("../sandbox");
const gql = require("graphql-tag");
const { Resolver } = require("@truffle/resolver");
let config, cleanupSandboxDir, server1, server2, run;

describe("truffle db", function () {
  // we really don't need to test this when running CI against Geth - there is
  // also a more complex setup since it requires 2 test nets to be running
  if (process.env.GETH) return;

  before(async function () {
    this.timeout(60000);
    const projectPath = path.join(__dirname, "..", "..", "sources", "db");
    ({ config, cleanupSandboxDir } = await sandbox.create(projectPath));
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
    await CommandRunner.run("migrate --network network1 --quiet", config);
    await CommandRunner.run("migrate --network network2 --quiet", config);
    const db = Db.connect(config.db);
    ({ run } = Db.Process.Run.forDb(db));
    config.resolver = new Resolver(config);
  });

  after(async function () {
    cleanupSandboxDir();
    await server1.close();
    await server2.close();
  });

  it("creates a project", async function () {
    const projects = await run(
      Db.Process.resources.all,
      "projects",
      gql`
        fragment myCoolProject on Project {
          id
          directory
        }
      `
    );
    assert(projects.length === 1);
    assert.equal(
      await fs.realpath(projects[0].directory),
      await fs.realpath(config.working_directory)
    );
  });

  it("retrieves contract instances by project", async function () {
    const projectId = Db.generateId("projects", {
      directory: await fs.realpath(config.working_directory)
    });
    const contractNames = ["VyperStorage", "MagicSquare", "SquareLib"];
    const networkNames = ["network1", "network2"];
    for (const networkName of networkNames) {
      for (const contractName of contractNames) {
        const project = await run(
          Db.Process.resources.get,
          "projects",
          projectId,
          // contractName and networkName is appended below just to stop
          // warnings about not having a unique fragment name
          gql`
            fragment myZanyProject${contractName}${networkName} on Project {
              contractInstance (
                contract: {
                  name: "${contractName}"
                }
                network: {
                  name: "${networkName}"
                }
              ) {
                address
                network {
                  networkId
                }
              }
            }
          `
        );
        const deployedAddress =
          config.resolver.require(contractName)._json.networks[
            project.contractInstance.network.networkId
          ].address;
        assert.equal(project.contractInstance.address, deployedAddress);
      }
    }
  });

  it("retrieves saved compilations", async function () {
    const compilations = await run(
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
    const contracts = await run(
      Db.Process.resources.all,
      "contracts",
      gql`
        fragment contractName on Contract {
          id
          name
        }
      `
    );
    assert.equal(contracts.length, 3);
  });

  it("loads contract sources", async function () {
    const sources = await run(
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
    const bytecodes = await run(
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
      6,
      "there should be 8 bytecodes, a create bytecode and a call bytecode per contract"
    );
  });
});
