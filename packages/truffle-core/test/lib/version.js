const version = require("../../lib/version");
const assert = require("assert");
const { core, solc } = version.info();
let logger, config;

describe("truffle-core/lib/version", () => {
  describe("logAll()", () => {
    beforeEach(() => {
      logger = {
        log: function(stringToLog) {
          this.loggedStuff = this.loggedStuff + stringToLog;
        },
        loggedStuff: ""
      };
      config = {
        compilers: {
          solc: {
            version: "0.5.0"
          }
        }
      };
    });

    it("logs some version information", () => {
      version.logAll(logger, config);
      assert(logger.loggedStuff.includes(core));
      assert(logger.loggedStuff.includes(solc));
    });
  });
});
