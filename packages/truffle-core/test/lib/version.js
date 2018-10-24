const version = require("../../lib/version");
const sinon = require("sinon");
const assert = require("assert");
const { core, solc } = version.info();
let logger;

describe("truffle-core/lib/version", () => {
  describe("log()", () => {
    beforeEach(() => {
      logger = {
        log: function (stringToLog) {
          this.loggedStuff = this.loggedStuff + stringToLog;
        },
        loggedStuff: ""
      }
    });

    it("logs some version information", () => {
      version.log(logger);
      assert(logger.loggedStuff.includes(core));
      assert(logger.loggedStuff.includes(solc));
    });
  });
});
