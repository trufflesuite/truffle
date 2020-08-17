const assert = require("assert");
const CommandRunner = require("../commandrunner");
const path = require("path");
const tmp = require("tmp");
const fse = require("fs-extra");

describe("truffle init [ @standalone ]", () => {
  let tempDir, config;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    config = {
      working_directory: tempDir.name,
      logger: { log: () => {} },
    };
  });
  afterEach(() => {
    tempDir.removeCallback();
  });

  it("does not error", async () => {
    await CommandRunner.run("init", config);
  }).timeout(30000);

  it("unboxes a project with a truffle config", async () => {
    await CommandRunner.run(`init ${tempDir.name}`, config);
    assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
  }).timeout(20000);

  describe("when a path is provided", () => {
    it("initializes with a relative path", async () => {
      const myPath = "./my/favorite/folder/structure";
      await CommandRunner.run(`init ${myPath}`, config);
      assert(
        fse.existsSync(path.join(tempDir.name, myPath, "truffle-config.js"))
      );
    }).timeout(20000);

    it("initializes with an absolute path", async () => {
      const myPath = path.join(tempDir.name, "somethingElse");
      await CommandRunner.run(`init ${myPath}`, config);
      assert(fse.existsSync(path.join(myPath, "truffle-config.js")));
    }).timeout(20000);
  });
});
