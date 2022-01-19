import assert from "assert";
import "mocha";
import Config from "@truffle/config";
import { fetchAndCompile } from "../lib/index";
import axios from "axios";
import sinon from "sinon";
const fixture: any = require("./fixture.js");

function stubAxiosGetMethod(url: string, address: string, data: object) {
  sinon
    .stub(axios, "get")
    .withArgs(url, {
      params: {
        module: "contract",
        action: "getsourcecode",
        address: address,
        apikey: ""
      },
      responseType: "json",
      maxRedirects: 50
    })
    .returns(Promise.resolve({ data: data }));
}

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
    stubAxiosGetMethod(
      "https://api.etherscan.io/api",
      address,
      fixture.mainnetData
    );
    //TS can't detect that is a sinon stub so we have to use ts-ignore
    //@ts-ignore
    axios.get.callThrough();
    const result = await fetchAndCompile(address, config);
    const contractNameFromResult = result.sourceInfo.contractName;
    const contractNameFromSourceInfo =
      result.compileResult.compilations[0].contracts;
    assert(
      contractNameFromSourceInfo.some(
        item => item.contractName === "UniswapV2Router02"
      )
    );
    assert.equal(contractNameFromResult, "UniswapV2Router02");
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
    //asserting that arbitrum url and contract address is passed as args
    stubAxiosGetMethod(
      "https://api.arbiscan.io/api",
      address,
      fixture.arbitrumData
    );
    //TS can't detect that is a sinon stub so we have to use ts-ignore
    //@ts-ignore
    axios.get.callThrough();
    const result = await fetchAndCompile(address, config);
    const contractNameFromResult = result.sourceInfo.contractName;
    const contractNameFromSourceInfo =
      result.compileResult.compilations[0].contracts;
    assert(
      contractNameFromSourceInfo.some(item => item.contractName === "Storage")
    );
    assert.equal(contractNameFromResult, "Storage");
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
    //asserting that polygon url and contract address is passed as args
    stubAxiosGetMethod(
      "https://api.polygonscan.com/api",
      address,
      fixture.polygonData
    );
    //TS can't detect that is a sinon stub so we have to use ts-ignore
    //@ts-ignore
    axios.get.callThrough();
    const result = await fetchAndCompile(address, config);
    const contractNameFromResult = result.sourceInfo.contractName;
    const contractNameFromSourceInfo =
      result.compileResult.compilations[0].contracts;
    assert(
      contractNameFromSourceInfo.some(
        item => item.contractName === "GrowthVault"
      )
    );
    assert.equal(contractNameFromResult, "GrowthVault");
  });
});
