const version = require("../../lib/version");
const assert = require("assert");
const { core, solc } = version.info();
const truffleVersion = require("../../package.json").version;
let logger, config, nodeVersion;

describe("truffle-core/lib/version", () => {
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

  describe("logAll()", () => {
    it("logs some version information", () => {
      version.logAll(logger, config);
      assert(logger.loggedStuff.includes(core));
      assert(logger.loggedStuff.includes(solc));
    });
  });

  describe("logTruffleAndNode()", () => {
    it("logs truffle and node versions", () => {
      version.logTruffleAndNode(logger, config);
      nodeVersion = process.version;
      assert(logger.loggedStuff.includes(nodeVersion));
      assert(logger.loggedStuff.includes(truffleVersion));
    });
  });
});
