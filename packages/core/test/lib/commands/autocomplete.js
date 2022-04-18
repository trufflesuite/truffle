const TaskError = require("../../../lib/errors/taskerror");
const autocomplete = require("../../../lib/commands/autocomplete");
const chai = require("chai");
const { default: Box } = require("@truffle/box");
const sinon = require("sinon");

const assert = chai.assert;

describe("autocomplete", () => {
  let config;

  beforeEach(async () => {
    config = await Box.sandbox({});
    sinon.stub(console, "log");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("throws exception if unsupported shell is requested", async () => {
    const options = { _: ["invalid"] };
    assert.isRejected(autocomplete.run(config.with(options)), TaskError);
  });

  it("implements bash completion", async () => {
    const options = { _: ["bash"] };
    await autocomplete.run(config.with(options));
    assert.include(console.log.lastCall.firstArg, "yargs_completions");
    assert.include(console.log.lastCall.firstArg, "bash");
  });

  it("implements zsh completion", async () => {
    const options = { _: ["zsh"] };
    await autocomplete.run(config.with(options));
    assert.include(console.log.lastCall.firstArg, "yargs_completions");
    assert.include(console.log.lastCall.firstArg, "compdef");
  });
});
