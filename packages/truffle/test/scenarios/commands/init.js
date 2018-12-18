const assert = require("assert");
const CommandRunner = require("../commandrunner");
const path = require("path");
const tmp = require("tmp");
const fs = require("fs");

describe("truffle init", () => {
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
      assert(typeof error === "undefined");
      done();
    });
  }).timeout(30000);

  it("unboxes a project with a truffle config", done => {
    CommandRunner.run("init", config, () => {
      assert(fs.existsSync(path.join(tempDir.name, "truffle-config.js")));
      done();
    });
  }).timeout(20000);
});
