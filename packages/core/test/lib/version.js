const Config = require("@truffle/config");
const version = require("../../lib/version");
const assert = require("assert");
const truffleVersion = require("../../package.json").version;
let logger, config, nodeVersion;

describe("core/lib/version", () => {
  beforeEach(() => {
    logger = {
      log: function(stringToLog) {
        this.loggedStuff = this.loggedStuff + stringToLog;
      },
      loggedStuff: ""
    };
    config = new Config();
    ({ core, solc } = version.info(config));
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
