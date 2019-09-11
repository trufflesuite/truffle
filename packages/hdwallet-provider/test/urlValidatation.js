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
      const expectedMessage = [
        `Malformed provider URL: '${badUrl}'`,
        "Please specify a correct URL, using the http, https, ws, or wss protocol.",
        ""
      ].join("\n");
      assert.equal(e.message, expectedMessage);
    }
  });

  it("throws a meaningful error when url is without slashes or slash", () => {
    const badUrl = "http:localhost/v1/badbeef";
    try {
      new WalletProvider("", badUrl, 0, 100);
      assert.fail("did not throw!");
    } catch (e) {
      const expectedMessage = [
        `Malformed provider URL: '${badUrl}'`,
        "Please specify a correct URL, using the http, https, ws, or wss protocol.",
        ""
      ].join("\n");
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
