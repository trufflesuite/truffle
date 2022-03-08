import debugModule from "debug";
const debug = debugModule("debugger:test:data:decode");

import Ganache from "ganache";
import { assert } from "chai";
import changeCase from "change-case";
import * as Codec from "@truffle/codec";

import { prepareContracts } from "test/helpers";

import Debugger from "lib/debugger";

import sourcemapping from "lib/sourcemapping/selectors";

export function* generateUints() {
  let x = 0;
  while (true) {
    yield x;
    x++;
  }
}

function contractName(testName) {
  return testName.replace(/ /g, "");
}

function fileName(testName) {
  return `${contractName(testName)}.sol`;
}

function generateTests(fixtures) {
  for (let { name, value: expected } of fixtures) {
    it(`correctly decodes ${name}`, async () => {
      const response = await this.decode(name);
      assert.deepEqual(response, expected);
    });
  }
}

function lastStatementLine(source) {
  const lines = source.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    let line = lines[i];
    if (line.indexOf(";") != -1) {
      return i;
    }
  }
}

async function prepareDebugger(testName, sources) {
  const provider = Ganache.provider({
    seed: "debugger",
    gasLimit: 7000000,
    logging: {
      quiet: true
    },
    miner: {
      instamine: "strict"
    }
  });

  let { abstractions, compilations } = await prepareContracts(
    provider,
    sources
  );

  let instance = await abstractions[contractName(testName)].deployed();
  let receipt = await instance.run();
  let txHash = receipt.tx;

  let bugger = await Debugger.forTx(txHash, { provider, compilations });

  let source = sources[fileName(testName)];

  //we'll need the debugger-internal ID of this source
  let debuggerSources = Object.values(bugger.view(sourcemapping.views.sources));
  let matchingSources = debuggerSources.filter(sourceObject =>
    sourceObject.sourcePath.includes(contractName(testName))
  );
  let sourceId = matchingSources[0].id;

  let breakpoint = {
    sourceId,
    line: lastStatementLine(source)
  };

  await bugger.addBreakpoint(breakpoint);

  await bugger.continueUntilBreakpoint();

  return bugger;
}

async function decode(name) {
  return Codec.Format.Utils.Inspect.unsafeNativize(
    await this.session.variable(name)
  );
}

export function describeDecoding(testName, fixtures, selector, generateSource) {
  const sources = {
    [fileName(testName)]: generateSource(contractName(testName), fixtures)
  };

  describe(testName, function () {
    const testDebug = debugModule(
      `test:data:decode:${changeCase.paramCase(testName)}`
    );

    testDebug("source %s", Object.values(sources)[0]);

    this.timeout(30000);

    before("runs and observes debugger", async () => {
      this.session = await prepareDebugger(testName, sources);
      this.decode = decode;

      if (selector) {
        debug("selector %O", this.session.view(selector));
      }
    });

    generateTests.bind(this)(fixtures);
  });
}
