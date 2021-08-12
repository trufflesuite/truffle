const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

describe("truffle exec [ @standalone ]", function () {
  let config;
  const project = path.join(__dirname, "../../sources/exec");
  const logger = new MemoryLogger();

  before("set up the server", function (done) {
    Server.start(done);
  });

  after("stop server", function (done) {
    Server.stop(done);
  });

  beforeEach("set up sandbox", function () {
    this.timeout(10000);
    return sandbox.create(project).then(conf => {
      config = conf;
      config.network = "development";
      config.logger = logger;
      config.mocha = {
        reporter: new Reporter(logger)
      };
    });
  });

  it("runs script after compiling", async function () {
    this.timeout(30000);
    await CommandRunner.run("compile", config);
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "Executable.json")
      )
    );

    await CommandRunner.run("exec script.js", config);
    const output = logger.contents();
    assert(output.includes("5"));
  });

  // Check accuracy of next test
  it("errors when run without compiling", async function () {
    this.timeout(30000);
    try {
      await CommandRunner.run("exec script.js", config);
      assert(false, "An error should have occurred.");
    } catch (_error) {
      assert(true);
    }
  });

  it("succeeds when -c flag is set", async function () {
    this.timeout(30000);
    await CommandRunner.run("exec -c script.js", config);
    const output = logger.contents();
    assert(output.includes("5"));
  });
});
