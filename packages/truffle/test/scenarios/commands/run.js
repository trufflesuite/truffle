const assert = require("assert");
const CommandRunner = require("../commandrunner");
const MemoryLogger = require("../memorylogger");
const sandbox = require("../sandbox");
const path = require("path");

const logger = new MemoryLogger();
let config, project;

const loadSandboxLogger = source => {
  project = path.join(__dirname, source);
  return sandbox.load(project).then(conf => {
    config = conf;
    config.logger = logger;
  });
};

describe("truffle run", () => {
  describe("when run without arguments", () => {
    beforeEach(() => {
      return loadSandboxLogger("../../sources/run/mockProjectWithPlugin");
    });

    it("displays general help", done => {
      CommandRunner.run("run", config, () => {
        const output = logger.contents();
        assert(output.includes("Usage:        truffle run [<command>]"));
        done();
      });
    }).timeout(20000);

    it("should not error", done => {
      CommandRunner.run("run", config, error => {
        assert(typeof error === "undefined");
        done();
      });
    }).timeout(20000);
  });

  describe("when run with an argument", () => {
    describe("without plugins configured", () => {
      before(() => {
        return loadSandboxLogger("../../sources/run/mockProjectWithoutPlugin");
      });

      it("whines about having no plugins configured", done => {
        CommandRunner.run("run mock", config, () => {
          const output = logger.contents();
          assert(output.includes("Error: No plugins detected"));
          done();
        });
      }).timeout(10000);
    }).timeout(10000);

    describe("with plugins configured", () => {
      describe("error handling", () => {
        it("throws error when plugins formatted incorrectly", done => {
          loadSandboxLogger(
            "../../sources/run/mockProjectWithBadPluginFormat"
          ).then(() =>
            CommandRunner.run("run mock", config, () => {
              const output = logger.contents();
              assert(output.includes("Error: Plugins configured incorrectly."));
              done();
            })
          );
        }).timeout(10000);

        it("throws error when plugins configured but not installed", done => {
          loadSandboxLogger(
            "../../sources/run/mockProjectWithMissingPluginModule"
          ).then(() =>
            CommandRunner.run("run mock", config, () => {
              const output = logger.contents();
              assert(output.includes("listed as a plugin, but not found"));
              done();
            })
          );
        }).timeout(10000);

        it("throws error when plugins are missing truffle-plugin.json", done => {
          loadSandboxLogger(
            "../../sources/run/mockProjectWithMissingPluginConfig"
          ).then(() =>
            CommandRunner.run("run mock", config, () => {
              const output = logger.contents();
              assert(output.includes("Error: truffle-plugin.json not found"));
              done();
            })
          );
        }).timeout(10000);

        it("throws error when configured/installed plugins don't support the given arg/command", done => {
          loadSandboxLogger("../../sources/run/mockProjectWithPlugin").then(
            () =>
              CommandRunner.run("run mock", config, () => {
                const output = logger.contents();
                assert(output.includes("command not supported"));
                done();
              })
          );
        }).timeout(20000);

        it("throws error if command in truffle-plugin.json uses an absolute path", done => {
          loadSandboxLogger(
            "../../sources/run/mockProjectWithAbsolutePath"
          ).then(() =>
            CommandRunner.run("run mock", config, () => {
              const output = logger.contents();
              assert(output.includes("Error: Absolute paths not allowed!"));
              done();
            })
          );
        }).timeout(10000);
      });
      describe("when plugins configured and installed that support a given argument", () => {
        before(() => {
          return loadSandboxLogger(
            "../../sources/run/mockProjectWithWorkingPlugin"
          );
        });

        it("runs the command script", done => {
          CommandRunner.run("run mock", config, () => {
            const output = logger.contents();
            assert(output.includes("Running truffle-mock!"));
            done();
          });
        }).timeout(20000);
      });
    });
  }).timeout(10000);
});
