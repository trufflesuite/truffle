const assert = require("chai").assert;
const { inlineConfigNetwork } = require("../../../lib/commands/debug");
let options, result;

describe("debug", () => {
  describe("inlineConfigNetwork(options)", () => {
    describe("when the user specifies url parameter", () => {
      beforeEach(() => {
        options = {
          url: "http://urlhost:1234"
        };
      });

      it("should create networks item in config", () => {
        result = inlineConfigNetwork(options);

        assert.notEqual(result.networks.inline_config, undefined);
        assert.equal(result.networks.inline_config.url, "http://urlhost:1234");
        assert.equal(result.networks.inline_config.network_id, "*");
      });

      it("should set inline_network by default", () => {
        result = inlineConfigNetwork(options);
        assert.equal(result.network, "inline_config");
      });

      it("should override network field when specified in options", () => {
        options.network = "different_network";

        result = inlineConfigNetwork(options);
        assert.equal(result.network, "different_network");
      });

      it("should set compileNone to true by default", () => {
        result = inlineConfigNetwork(options);
        assert.equal(result.compileNone, true);
      });
    });
  });
});
