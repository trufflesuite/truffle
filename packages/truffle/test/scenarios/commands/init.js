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
      logger: { log: () => {} }
    };
  });
  afterEach(() => {
    tempDir.removeCallback();
  });

  it("does not error", done => {
    CommandRunner.run("init", config, error => {
      if (error) done(error);
      assert(typeof error === "undefined");
      done();
    });
  }).timeout(30000);

  it("unboxes a project with a truffle config", done => {
    CommandRunner.run("init", config, () => {
      assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
      done();
    });
  }).timeout(20000);

  describe("when a path is provided", () => {
    it("initializes with a relative path", done => {
      const myPath = "./my/favorite/folder/structure";
      CommandRunner.run(`init ${myPath}`, config, error => {
        if (error) done(error);
        assert(
          fse.existsSync(path.join(tempDir.name, myPath, "truffle-config.js"))
        );
        done();
      });
    }).timeout(20000);
    it("initializes with an absolute path", done => {
      const myPath = path.join(tempDir.name, "somethingElse");
      CommandRunner.run(`init ${myPath}`, config, error => {
        if (error) done(error);
        assert(fse.existsSync(path.join(myPath, "truffle-config.js")));
        done();
      });
    }).timeout(20000);
  });
});
