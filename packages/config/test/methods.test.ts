import fs from "fs";
import path from "path";
import assert from "assert";
import TruffleConfig from "../dist";
import { describe, it } from "mocha";
import sinon from "sinon";

const DEFAULT_CONFIG_FILENAME = "./test/truffle-config.js";
const BACKUP_CONFIG_FILENAME = "./test/truffle.js"; // old config filename

let expectedPath: string;
let options: { config: string };

describe("TruffleConfig.detect", () => {
  describe("when a config path is provided", () => {
    beforeEach(() => {
      sinon.stub(TruffleConfig, "load");
      options = { config: "/my/favorite/config.js" };
      expectedPath = "/my/favorite/config.js";
    });
    afterEach(() => {
      (TruffleConfig as any).load.restore();
    });

    it("loads a config from the options if available", () => {
      TruffleConfig.detect(options);
      assert((TruffleConfig as any).load.calledWith(expectedPath));
    });
    it("loads a config even with a relative path", () => {
      options.config = "../../config.js";
      TruffleConfig.detect(options);
      assert(
        (TruffleConfig as any).load.calledWith(
          path.resolve(process.cwd(), "../../config.js")
        )
      );
    });
  });
});

describe(".load", () => {
  const config1 = `${__dirname}/testConfig.js`;
  const config2 = `${__dirname}/testConfig2.js`; // identical to config1
  const config3 = `${__dirname}/testConfig3.js`; // different mnemonic from 1&2

  it("providers should not be ===", () => {
    const Config1 = TruffleConfig.load(config1);
    const Config2 = TruffleConfig.load(config2);
    const Config3 = TruffleConfig.load(config3);

    const prov1 = Config1.networks.develop.provider();
    const prov2 = Config2.networks.develop.provider();
    const prov3 = Config3.networks.develop.provider();

    assert.equal(prov1 === prov2, false);
    assert.equal(prov2 === prov3, false);

    assert.notStrictEqual(prov1, prov2);
    assert.notStrictEqual(prov2, prov3);
  });
});

describe("when it can't find a config file", () => {
  beforeEach(() => {
    sinon.stub(TruffleConfig, "search").returns(null);
  });
  afterEach(() => {
    (TruffleConfig as any).search.restore();
  });

  it("throws if a truffle config isn't detected", () => {
    assert.throws(() => {
      TruffleConfig.detect();
    }, "should have thrown!");
  });
});

before(() => {
  fs.closeSync(fs.openSync("./test/truffle-config.js", "w"));
  fs.closeSync(fs.openSync("./test/truffle.js", "w"));
});

after(() => {
  if (fs.existsSync(DEFAULT_CONFIG_FILENAME)) {
    fs.unlinkSync(DEFAULT_CONFIG_FILENAME);
  }

  if (fs.existsSync(BACKUP_CONFIG_FILENAME)) {
    fs.unlinkSync(BACKUP_CONFIG_FILENAME);
  }
});

describe("TruffleConfig.search", () => {
  const options = {
    workingDirectory: `${process.cwd()}/test`
  };

  let loggedStuff = "";

  console.warn = (stringToLog: string) => {
    loggedStuff = loggedStuff + stringToLog;
  };

  it("returns null if passed a file that doesn't exist", () => {
    const nonExistentConfig = TruffleConfig.search(options, "badConfig.js");
    assert.strictEqual(nonExistentConfig, null);
  });

  it("outputs warning and returns truffle-config.js path if both truffle.js and truffle-config.js are found", () => {
    const truffleConfigPath = TruffleConfig.search(options);

    assert.strictEqual(
      path.normalize(truffleConfigPath!),
      path.normalize(`${process.cwd()}/test/truffle-config.js`)
    );

    assert(
      loggedStuff.includes(
        "Warning: Both truffle-config.js and truffle.js were found."
      )
    );
  });

  it("outputs warning and returns truffle.js path if only truffle.js detected on windows ", () => {
    fs.unlinkSync("./test/truffle-config.js");

    Object.defineProperty(process, "platform", {
      value: "win32"
    });

    const truffleConfigPath = TruffleConfig.search(options);

    assert.strictEqual(
      path.normalize(truffleConfigPath!),
      path.normalize(`${process.cwd()}/test/truffle.js`)
    );

    assert(loggedStuff.includes("Warning: Please rename truffle.js"));

    fs.closeSync(fs.openSync("./test/truffle-config.js", "w"));
  });
});
