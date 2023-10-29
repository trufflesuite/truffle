const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");

describe("truffle exec [ @standalone ]", function () {
  let config, cleanupSandboxDir;
  const project = path.join(__dirname, "../../sources/exec");
  const logger = new MemoryLogger();

  beforeEach(async function () {
    this.timeout(10000);
    ({ config, cleanupSandboxDir } = await sandbox.create(project));
    config.network = "development";
    config.logger = logger;
    await Server.start();
  });

  afterEach(function () {
    cleanupSandboxDir();
  });

  after(async function () {
    await Server.stop();
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

  it("runs script when --url option is passed", async function () {
    this.timeout(30000);
    await CommandRunner.run("compile", config);
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "Executable.json")
      )
    );

    await CommandRunner.run(
      "exec script.js --url http://127.0.0.1:8545",
      config
    );
    const output = logger.contents();
    assert(output.includes("5"));
  });
});
