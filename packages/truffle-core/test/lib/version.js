const version = require("../../lib/version");
const sinon = require("sinon");
const assert = require("assert");
const { core, solc } = version.getVersionInformation();
let logger;

describe("truffle-core/lib/version", () => {
  describe("logVersionInformation()", () => {
    beforeEach(() => {
      logger = {
        log: function (stringToLog) {
          this.loggedStuff = this.loggedStuff + stringToLog;
        },
        loggedStuff: ""
      }
    });

    it("logs some version information", () => {
      version.logVersionInformation(logger);
      assert(logger.loggedStuff.includes(core));
      assert(logger.loggedStuff.includes(solc));
    });
  });
});
