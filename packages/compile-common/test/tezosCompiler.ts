import assert from "assert";
import sinon from "sinon";
import Config from "@truffle/config";

import { TezosCompiler } from "../src";

describe("Tezos Compiler", function () {
  this.timeout(20000);
  const sandbox = sinon.createSandbox();

  const defaultSettings = {
    quiet: true,
    compilers: {}
  };
  const config = new Config().merge(defaultSettings);
  config.compilers["tezos"] = { settings: {} };

  it("all compiles files from findContracts", async function () {
    const expectedResult = {};
    const compileStrategy = {
      compile: () => Promise.resolve(expectedResult),
      compiler: "tezos"
    } as any;

    const profiler = {
      requiredSources: () => Promise.resolve({ allSources: { "file1.tz": {}, "file2.tz": {} } })
    } as any;

    const findContracts = () => Promise.resolve(["file1.tz", "file2.tz"]);

    sandbox.spy(compileStrategy, "compile");
    sandbox.spy(profiler, "requiredSources");

    const tezosCompiler = new TezosCompiler(compileStrategy, profiler, findContracts);

    const result = await tezosCompiler.all(config);

    assert(compileStrategy.compile.calledOnce, "compile method is called once");
    assert(compileStrategy.compile.firstCall.calledWith(["file1.tz", "file2.tz"], {}), "compile method called with expected values");

    assert(profiler.requiredSources.calledOnce, "rrequiredSources method is called once");
    assert.deepEqual(profiler.requiredSources.firstCall.args[0].paths, ["file1.tz", "file2.tz"], "requiredSources method is called with expected values");

    assert.equal(result, expectedResult);
  });

  it("necessary compiles updated files", async function () {
    const expectedResult = {};
    const compileStrategy = {
      compile: () => Promise.resolve(expectedResult),
      compiler: "tezos"
    } as any;

    const profiler = {
      updated: () => Promise.resolve(["file1.tz", "file2.tz"]),
      requiredSources: () => Promise.resolve({ allSources: { "file1.tz": {}, "file2.tz": {} } })
    } as any;

    sandbox.spy(compileStrategy, "compile");
    sandbox.spy(profiler, "updated");
    sandbox.spy(profiler, "requiredSources");

    const tezosCompiler = new TezosCompiler(compileStrategy, profiler, () => Promise.resolve([]));

    const result = await tezosCompiler.necessary(config);

    assert(compileStrategy.compile.calledOnce, "compile method is called once");
    assert(compileStrategy.compile.firstCall.calledWith(["file1.tz", "file2.tz"], {}), "compile method called with expected values");

    assert(profiler.updated.calledOnce, "updated method is called once");
    assert(profiler.updated.firstCall.calledWith(config), "updated method is called with expected values");

    assert(profiler.requiredSources.calledOnce, "rrequiredSources method is called once");
    assert.deepEqual(profiler.requiredSources.firstCall.args[0].paths, ["file1.tz", "file2.tz"], "requiredSources method is called with expected values");

    assert.equal(result, expectedResult);
  });

  it("necessary returns if no files have been updated", async function () {
    const profiler = {
      updated: () => Promise.resolve([])
    } as any;

    sandbox.spy(profiler, "updated");

    const tezosCompiler = new TezosCompiler({} as any, profiler, () => Promise.resolve([]));

    const result = await tezosCompiler.necessary(config);

    assert(profiler.updated.calledOnce, "updated method is called once");
    assert(profiler.updated.firstCall.calledWith(config), "updated method is called with expected values");

    assert.deepEqual(result, { compilations: [] });
  });

  afterEach(() => {
    sandbox.restore();
  });
});
