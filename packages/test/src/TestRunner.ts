import { createInterfaceAdapter } from "@truffle/interface-adapter";
import web3Utils from "web3-utils";
import Config from "@truffle/config";
import Migrate from "@truffle/migrate";
import { Resolver } from "@truffle/resolver";
import expect from "@truffle/expect";
import util from "util";
import fs from "fs";
import path from "path";
import debugModule from "debug";
const debug = debugModule("lib:testing:testrunner");
import Decoder from "@truffle/decoder";
import Codec from "@truffle/codec";
import OS from "os";
import BN from "bn.js";

export default class TestRunner {
  public config: Config;
  public logger: any;
  public provider: any;
  public can_snapshot: boolean;
  public first_snapshot: boolean;
  public initial_snapshot: any;
  public interfaceAdapter: ReturnType<typeof createInterfaceAdapter>;
  public decoder: null | Awaited<ReturnType<typeof Decoder.forProject>>;
  public currentTestStartBlock: null | BN;
  public BEFORE_TIMEOUT: number;
  public TEST_TIMEOUT: number;
  public disableChecks: boolean;

  constructor(options: Config) {
    expect.options(options, [
      "resolver",
      "provider",
      "contracts_build_directory"
    ]);
    this.config = Config.default().merge(options);
    this.logger = options.logger || console;
    this.provider = options.provider;

    this.can_snapshot = false;
    this.first_snapshot = true;
    this.initial_snapshot = null;
    this.interfaceAdapter = createInterfaceAdapter({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
    this.decoder = null;

    // For each test
    this.currentTestStartBlock = null;

    this.BEFORE_TIMEOUT =
      (options.mocha && options.mocha.before_timeout) || 120000;
    this.TEST_TIMEOUT = (options.mocha && options.mocha.timeout) || 300000;
  }

  disableChecksOnEventDecoding() {
    this.disableChecks = true; //used by Solidity testing due to empty string problem on Solidity <0.7.6
  }

  reEnableChecksOnEventDecoding() {
    this.disableChecks = false;
  }

  async initialize() {
    debug("initializing");
    this.config.resolver = new Resolver(this.config, {
      includeTruffleSources: true
    });

    if (this.first_snapshot) {
      debug("taking first snapshot");
      try {
        let initial_snapshot = await this.snapshot();
        this.can_snapshot = true;
        this.initial_snapshot = initial_snapshot;
      } catch (error) {
        debug("first snapshot failed");
        debug("Error: %O", error);
      }
      this.first_snapshot = false;
    } else {
      await this.resetState();
    }

    //set up decoder
    let files = fs
      .readdirSync(this.config.contracts_build_directory)
      .filter(file => path.extname(file) === ".json");
    let data = files.map(file =>
      fs.readFileSync(
        path.join(this.config.contracts_build_directory, file),
        "utf8"
      )
    );
    let artifacts = data.map(text => JSON.parse(text));
    this.decoder = await Decoder.forProject({
      provider: this.provider,
      projectInfo: { artifacts }
    });
  }

  async deploy() {
    await Migrate.run(
      this.config.with({
        reset: true,
        quiet: true
      })
    );
  }

  async resetState() {
    if (this.can_snapshot) {
      debug("reverting...");
      await this.revert(this.initial_snapshot);
      this.initial_snapshot = await this.snapshot();
    } else {
      debug("redeploying...");
      await this.deploy();
    }
  }

  async startTest() {
    const blockNumber = web3Utils.toBN(
      await this.interfaceAdapter.getBlockNumber()
    );
    const one = web3Utils.toBN(1);

    // Add one in base 10
    this.currentTestStartBlock = blockNumber.add(one);
  }

  async endTest(mocha) {
    // Skip logging if test passes and `show-events` option is not true
    if (mocha.currentTest.state !== "failed" && !this.config["show-events"]) {
      return;
    }

    function indent(
      input: string,
      indentation: number,
      initialPrefix: string = ""
    ) {
      const unindented = input.split(/\r?\n/);
      return unindented
        .map((line, index) =>
          index === 0
            ? initialPrefix +
              " ".repeat(indentation - initialPrefix.length) +
              line
            : " ".repeat(indentation) + line
        )
        .join(OS.EOL);
    }

    function printEvent(decoding, indentation = 0, initialPrefix = "") {
      debug("raw event: %O", decoding);
      const inspected = util.inspect(
        new Codec.Export.LogDecodingInspector(decoding),
        {
          depth: null,
          colors: true,
          maxArrayLength: null,
          breakLength: 80 - indentation //should this include prefix lengths as well?
        }
      );
      return indent(inspected, indentation, initialPrefix);
    }

    if (this.decoder === null) {
      throw new Error("Decoder has not yet been initialized.");
    }
    if (this.currentTestStartBlock === null) {
      throw new Error(
        "`currentTestStartBlock` has not been initialized. You must " +
          "call `startTest` before calling `endTest`."
      );
    }

    const logs = await this.decoder.events({
      //NOTE: block numbers shouldn't be over 2^53 so this
      //should be fine, but should change this once decoder
      //accepts more general types for blocks
      fromBlock: this.currentTestStartBlock.toNumber(),
      extras: "necessary", //include weird decodings if usual ones fail :P
      disableChecks: this.disableChecks //for Solidity testing
    });

    const userDefinedEventLogs = logs.filter(log => {
      return log.decodings.every(decoding => decoding.abi.name !== "TestEvent");
    });

    if (userDefinedEventLogs.length === 0) {
      this.logger.log("    > No events were emitted");
      return;
    }

    this.logger.log("\n    Events emitted during test:");
    this.logger.log("    ---------------------------");
    this.logger.log("");

    for (const log of userDefinedEventLogs) {
      switch (log.decodings.length) {
        case 0:
          this.logger.log(`    Warning: Could not decode event!`);
          this.logger.log("");
          break;
        case 1:
          this.logger.log(printEvent(log.decodings[0], 4));
          this.logger.log("");
          break;
        default:
          this.logger.log(`    Ambiguous event, possible interpretations:`);
          for (const decoding of log.decodings) {
            this.logger.log(printEvent(decoding, 6, "    * "));
          }
          this.logger.log("");
          break;
      }
    }
    this.logger.log("\n    ---------------------------");
  }

  async snapshot() {
    return (await this.rpc("evm_snapshot")).result;
  }

  async revert(snapshot_id) {
    await this.rpc("evm_revert", [snapshot_id]);
  }

  async rpc(method: string, arg?: any) {
    let request = {
      jsonrpc: "2.0",
      method: method,
      id: Date.now(),
      params: arg
    };

    let result = await util.promisify(this.provider.send)(request);

    if (result.error != null) {
      throw new Error("RPC Error: " + (result.error.message || result.error));
    }

    return result;
  }
}
