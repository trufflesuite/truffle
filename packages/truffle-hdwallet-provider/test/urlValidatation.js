const assert = require("assert");
const WalletProvider = require("../src/index.js");
const { isValidProvider } = WalletProvider;

describe("HD Wallet Provider Validator", () => {
  it("fails missing protocol", () => {
    const badUrl = "localhost/v1/badbeef";
    assert.ok(
      !isValidProvider(badUrl),
      "Missing protocol should not pass validation"
    );
  });

  it("throws a meaningful error", () => {
    const badUrl = "localhost/v1/badbeef";
    try {
      new WalletProvider("", badUrl, 0, 100);
      assert.fail("did not throw!");
    } catch (e) {
      const expectedMessage =
        "Invalid url format. Please specify an appropriate protocol.\n\tValid protocols are: http | https | ws | wss";
      assert.equal(e.message, expectedMessage);
    }
  });

  it("fails unknown protocol", () => {
    const badUrl = "localhost/v1/badbeef";
    assert.ok(
      !isValidProvider(badUrl),
      "Missing protocol should not pass validation"
    );
  });

  describe("validates", () => {
    it("http protocol", () => {
      const goodUrl = "http://localhost:8545";
      assert.ok(
        isValidProvider(goodUrl),
        "Good HTTP Url should pass validation"
      );
    });

    it("https protocol", () => {
      const goodUrl = "https://localhost:8545";
      assert.ok(
        isValidProvider(goodUrl),
        "Good HTTPS Url should pass validation"
      );
    });

    it("ws protocol", () => {
      const goodUrl = "ws://localhost:8545";
      assert.ok(isValidProvider(goodUrl), "Good WS Url should pass validation");
    });

    it("wss protocol", () => {
      const goodUrl = "wss://localhost:8545";
      assert.ok(
        isValidProvider(goodUrl),
        "Good WSS Url should pass validation"
      );
    });
  });
});
