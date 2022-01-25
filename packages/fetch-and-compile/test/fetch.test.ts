import debugModule from "debug";
const debug = debugModule("fetch-and-compile:test");

import assert from "assert";
import "mocha";
import Config from "@truffle/config";
import { fetchAndCompile, fetchAndCompileMultiple } from "../lib/index";
import axios from "axios";
import sinon from "sinon";
const { etherscanFixture }: any = require("./fixture.js");

beforeEach(function () {
  sinon
    .stub(axios, "get")
    .withArgs(sinon.match.in(Object.keys(etherscanFixture)), sinon.match.any)
    .callsFake(async function (url, requestConfig) {
      debug("url: %s", url);
      debug("requestConfig: %o", requestConfig);
      if (requestConfig === undefined) {
        //apologies for the misuse of assertions, but I can't
        //get this to compile otherwise due to strictNullChecks
        assert.fail("requestConfig was undefined");
      }
      const address = requestConfig.params.address;
      return { data: etherscanFixture[url][address] };
    });
  //TS can't detect that is a sinon stub so we have to use ts-ignore
  //@ts-ignore
  axios.get.callThrough();
});

afterEach(function () {
  //TS can't detect that is a sinon stub so we have to use ts-ignore
  //@ts-ignore
  //restoring stub
  axios.get.restore();
});

describe("fetchAndCompile", function () {
  it("verifies contract from mainnet", async function () {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet"
    });
    const address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const result = await fetchAndCompile(address, config);
    const contractNameFromSourceInfo = result.sourceInfo.contractName;
    assert.equal(contractNameFromSourceInfo, "UniswapV2Router02");
    const contractsFromCompilation =
      result.compileResult.compilations[0].contracts;
    assert(
      contractsFromCompilation.some(
        item => item.contractName === "UniswapV2Router02"
      )
    );
  });

  it("verifies contract from arbitrum", async function () {
    const config = Config.default().merge({
      networks: {
        arbitrum: {
          network_id: 42161
        }
      },
      network: "arbitrum"
    });
    const address = "0x2B52D1B2b359eA39536069D8c6f2a3CFE3a09c31";
    const result = await fetchAndCompile(address, config);
    const contractNameFromSourceInfo = result.sourceInfo.contractName;
    assert.equal(contractNameFromSourceInfo, "Storage");
    const contractsFromCompilation =
      result.compileResult.compilations[0].contracts;
    assert(
      contractsFromCompilation.some(item => item.contractName === "Storage")
    );
  });

  it("verifies contract from polygon", async function () {
    const config = Config.default().merge({
      networks: {
        polygon: {
          network_id: 137
        }
      },
      network: "polygon"
    });
    const address = "0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398";
    const result = await fetchAndCompile(address, config);
    const contractNameFromSourceInfo = result.sourceInfo.contractName;
    assert.equal(contractNameFromSourceInfo, "GrowthVault");
    const contractsFromCompilation =
      result.compileResult.compilations[0].contracts;
    assert(
      contractsFromCompilation.some(item => item.contractName === "GrowthVault")
    );
  });
});

describe("fetchAndCompileMultiple", function () {
  it("verifies contracts from mainnet", async function () {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet"
    });
    const addresses = [
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
    ];
    const { results, failures } = await fetchAndCompileMultiple(
      addresses,
      config
    );
    assert.equal(Object.keys(failures).length, 0); //there should be no failures
    const expectedNames = ["UniswapV2Router02", "ENSRegistryWithFallback"];
    for (let i = 0; i < addresses.length; i++) {
      const result = results[addresses[i]];
      const contractNameFromSourceInfo = result.sourceInfo.contractName;
      assert.equal(contractNameFromSourceInfo, expectedNames[i]);
      const contractsFromCompilation =
        result.compileResult.compilations[0].contracts;
      assert(
        contractsFromCompilation.some(
          item => item.contractName === expectedNames[i]
        )
      );
    }
  });
});
