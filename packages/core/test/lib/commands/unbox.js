const assert = require("assert");
const unbox = require("../../../lib/commands/unbox");
const Config = require("@truffle/config");
const sinon = require("sinon");
const temp = require("temp").track();
let tempDir, mockConfig;

describe("commands/unbox.js", () => {
  const invalidBoxFormats = [
    "//",
    "/truffle-box/bare-box",
    "//truffle-box/bare-box#truffle-test-branch",
    "//truffle-box/bare-box#truffle-test-branch:path/SubDir",
    "/bare/",
    "//bare#truffle-test-branch",
    "//bare#truffle-test-branch:path/SubDir"
  ];
  const absolutePaths = [
    "https://github.com/truffle-box/bare-box:/path/SubDir",
    "truffle-box/bare-box:/path/subDir",
    "bare:/path/subDir",
    "git@github.com:truffle-box/bare-box:/path/subDir"
  ];
  const validBoxInput = [
    "https://github.com/truffle-box/bare-box",
    "truffle-box/bare-box",
    "bare",
    "git@github.com:truffle-box/bare-box",
    "https://github.com/truffle-box/bare-box#master"
  ];
  const relativePaths = [
    "https://github.com/truffle-box/bare-box:path/SubDir",
    "truffle-box/bare-box:path/subDir",
    "bare:path/subDir",
    "git@github.com:truffle-box/bare-box:path/subDir"
  ];

  describe("run", () => {
    beforeEach(() => {
      tempDir = temp.mkdirSync();
      mockConfig = Config.default().with({
        logger: { log: () => {} },
        working_directory: tempDir
      });
      mockConfig.events = {
        emit: () => {}
      };
      sinon.stub(Config, "default").returns({ with: () => mockConfig });
    });
    afterEach(() => {
      Config.default.restore();
    });

    describe("Error handling", () => {
      it("throws when passed an invalid box format", () => {
        invalidBoxFormats.forEach(val => {
          unbox
            .run({ _: [`${val}`] })
            .then(() => {
              assert(false);
            })
            .catch(() => {
              assert(true);
            });
        });
      });

      it("throws when passed an absolute unbox path", () => {
        absolutePaths.forEach(path => {
          unbox
            .run({ _: [`${path}`] })
            .then(() => {
              assert(false);
            })
            .catch(() => {
              assert(true);
            });
        });
      });
    });

    describe("successful unboxes", () => {
      it("runs when passed valid box input", () => {
        let promises = [];
        validBoxInput.forEach(val => {
          promises.push(unbox.run({ _: [`${val}`], force: true }));
        });
        return Promise.all(promises)
          .then(() => {
            assert(true);
          })
          .catch(error => {
            assert(false, error.message);
          });
      }).timeout(10000);

      it("runs when passed a relative unbox path", () => {
        let promises = [];
        relativePaths.forEach(path => {
          promises.push(unbox.run({ _: [`${path}`], force: true }));
        });
        return Promise.all(promises)
          .then(() => {
            assert(true);
          })
          .catch(error => {
            assert(false, error.message);
          });
      }).timeout(10000);
    });
  });
});
