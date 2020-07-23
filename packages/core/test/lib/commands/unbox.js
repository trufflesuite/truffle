const assert = require("assert");
const unbox = require("../../../lib/commands/unbox");
const Config = require("@truffle/config");
const sinon = require("sinon");
const tmp = require("tmp");
tmp.setGracefulCleanup();
let tempDir, mockConfig;

describe("commands/unbox.js", () => {
  const invalidBoxFormats = [
    "//",
    "/truffle-box/bare-box",
    "//truffle-box/bare-box#truffle-test-branch",
    "//truffle-box/bare-box#truffle-test-branch",
    "/bare/",
    "//bare#truffle-test-branch",
  ];
  const validBoxInput = [
    "bare",
    "truffle-box/bare-box",
    "truffle-box/bare-box#master",
    "https://github.com/truffle-box/bare-box",
    "https://github.com:truffle-box/bare-box",
    "https://github.com/truffle-box/bare-box#master",
    "git@github.com:truffle-box/bare-box",
    "git@github.com:truffle-box/bare-box#master",
  ];

  describe("run", () => {
    beforeEach(() => {
      tempDir = tmp.dirSync({
        unsafeCleanup: true,
      });
      mockConfig = Config.default().with({
        logger: { log: () => {} },
        working_directory: tempDir.name,
      });
      mockConfig.events = {
        emit: () => {},
      };
      sinon.stub(Config, "default").returns({ with: () => mockConfig });
    });
    afterEach(() => {
      Config.default.restore();
    });

    describe("Error handling", () => {
      it("throws when passed an invalid box format", () => {
        invalidBoxFormats.forEach((val) => {
          assert.throws(
            () => {
              unbox.run({ _: [`${val}`] });
            },
            Error,
            "Error not thrown!"
          );
        });
      });
    });

    describe("successful unboxes", () => {
      it("runs when passed valid box input", (done) => {
        let promises = [];
        validBoxInput.forEach((val) => {
          promises.push(
            new Promise((resolve) => {
              unbox.run({ _: [`${val}`], force: true }, () => resolve());
            })
          );
        });
        Promise.all(promises).then(() => done());
      }).timeout(10000);
    });
  });
});
