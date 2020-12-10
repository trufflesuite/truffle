const assert = require("assert");
const unbox = require("../../../lib/commands/unbox");
const Config = require("@truffle/config");
const sinon = require("sinon");
const tmp = require("tmp");
tmp.setGracefulCleanup();
let tempDir, mockConfig;

describe("commands/unbox.js", () => {
  const invalidBoxFormats = ["bare-box//"];
  const validBoxInput = [
    "bare",
    "truffle-box/bare-box",
    "truffle-box/bare-box#master",
    "https://github.com/truffle-box/bare-box",
    "https://github.com:truffle-box/bare-box",
    "https://github.com/truffle-box/bare-box#master",
    "git@github.com:truffle-box/bare-box",
    "git@github.com:truffle-box/bare-box#master",
    "../box/test/sources/mock-local-box"
  ];

  describe("run", () => {
    beforeEach(() => {
      tempDir = tmp.dirSync({
        unsafeCleanup: true
      });
      mockConfig = Config.default().with({
        logger: {log: () => {}},
        working_directory: tempDir.name
      });
      mockConfig.events = {
        emit: () => {}
      };
      sinon.stub(Config, "default").returns({with: () => mockConfig});
    });
    afterEach(() => {
      Config.default.restore();
    });

    describe("Error handling", () => {
      it("throws when passed an invalid box format", async () => {
        const promises = [];
        for (const path of invalidBoxFormats) {
          promises.push(
            unbox
              .run({_: [`${path}`]})
              .then(() => assert.fail())
              .catch(_error => assert(true))
          );
        }
        return Promise.all(promises);
      });
    });

    describe("successful unboxes", () => {
      it("runs when passed valid box input", async () => {
        let promises = [];
        validBoxInput.forEach(val => {
          promises.push(
            unbox
              .run({_: [`${val}`], force: true})
              .then(() => assert(true))
              .catch(_error => assert.fail())
          );
        });
        return Promise.all(promises);
      }).timeout(10000);
    });
  });
});
