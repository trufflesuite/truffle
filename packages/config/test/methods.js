const assert = require("assert");
const fs = require("fs");
const TruffleConfig = require("../");
const sinon = require("sinon");
const path = require("path");
let expectedPath, options;

describe("TruffleConfig.detect", () => {
  describe("when a config path is provided", () => {
    beforeEach(() => {
      sinon.stub(TruffleConfig, "load");
      options = { configPath: "/my/favorite/config.js" };
      expectedPath = "/my/favorite/config.js";
    });
    afterEach(() => {
      TruffleConfig.load.restore();
    });

    it("loads a config from the options if available", () => {
      TruffleConfig.detect(options);
      assert(TruffleConfig.load.calledWith(expectedPath));
    });
    it("loads a config even with a relative path", () => {
      options.configPath = "../../config.js";
      TruffleConfig.detect(options);
      assert(
        TruffleConfig.load.calledWith(
          path.resolve(process.cwd(), "../../config.js")
        )
      );
    });
  });

  it("throws if a truffle config isn't detected", () => {
    assert.throws(() => {
      TruffleConfig.detect();
    }, "should have thrown!");
  });
});

before(() => {
  fs.closeSync(fs.openSync(`./test/truffle-config.js`, "w"));
  fs.closeSync(fs.openSync(`./test/truffle.js`, "w"));
});
after(() => {
  fs.unlinkSync(`./test/truffle-config.js`);
  fs.unlinkSync(`./test/truffle.js`);
});

describe("TruffleConfig.search", () => {
  const options = {
    workingDirectory: `${process.cwd()}/test`
  };
  let loggedStuff = "";
  console.warn = stringToLog => {
    loggedStuff = loggedStuff + stringToLog;
  };
  it("returns null if passed a file that doesn't exist", () => {
    const nonExistentConfig = TruffleConfig.search(options, "badConfig.js");
    assert.strictEqual(nonExistentConfig, null);
  });

  it("outputs warning and returns truffle-config.js path if both truffle.js and truffle-config.js are found", () => {
    truffleConfigPath = TruffleConfig.search(options);
    assert.strictEqual(
      truffleConfigPath,
      `${process.cwd()}/test/truffle-config.js`
    );
    assert(
      loggedStuff.includes(
        "Warning: Both truffle-config.js and truffle.js were found."
      )
    );
  });

  it("outputs warning and returns truffle.js path if only truffle.js detected on windows ", () => {
    fs.unlinkSync(`./test/truffle-config.js`);
    Object.defineProperty(process, "platform", {
      value: "windows"
    });

    truffleConfigPath = TruffleConfig.search(options);

    assert.strictEqual(truffleConfigPath, `${process.cwd()}/test/truffle.js`);
    assert(loggedStuff.includes("Warning: Please rename truffle.js"));

    fs.closeSync(fs.openSync(`./test/truffle-config.js`, "w"));
  });
});
