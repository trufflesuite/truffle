import assert from "assert";
import { describe, it } from "mocha";
import Config from "@truffle/config";
import { fetchAndCompile } from "../lib/index";
import axios from "axios";
import sinon from "sinon";
const fixture: any = require("./fixture.js");

function stubber(url: string, address_: string, data_: object) {
  sinon.stub(axios, 'get').withArgs(url, {
    params: {
      module: "contract",
      action: "getsourcecode",
      address: address_,
      apikey: ''
    },
    responseType: "json",
    maxRedirects: 50
  }).returns(Promise.resolve({ data: data_ }))
}

describe("fetches contract and checks for verification", () => {
  it('resolves with verified contract from mainnet', async () => {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet",
    });
    //asserting that mainnet url and contract address is passed as args
    stubber("https://api.etherscan.io/api", '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', fixture.mainnetData)
    //@ts-ignore
    axios.get.callThrough();
    const result = await fetchAndCompile('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', config)
    let contractName = result.sourceInfo.contractName
    //assert contract name is correct 
    assert.equal(contractName, "UniswapV2Router02")
    //assert contract name is not undefined
    assert.notEqual(contractName, undefined)
    //@ts-ignore
    //restoring stub
    axios.get.restore()
  })
  it('resolves with verified contract from arbitrum', async () => {
    const config = Config.default().merge({
      networks: {
        arbitrum: {
          network_id: 42161
        }
      },
      network: "arbitrum",
    });
    //asserting that arbitrum url and contract address is passed as args
    stubber("https://api.arbiscan.io/api", '0xBf00759D7E329d7A7fa1D4DCdC914C53d1d2db86', fixture.arbitrumData)
    //@ts-ignore
    axios.get.callThrough();
    const result = await fetchAndCompile('0xBf00759D7E329d7A7fa1D4DCdC914C53d1d2db86', config)
    let contractName = result.sourceInfo.contractName
    //assert contract name is correct 
    assert.equal(contractName, "stARBIS")
    //assert contract name is not undefined
    assert.notEqual(contractName, undefined)
    //@ts-ignore
    axios.get.restore()
  });
  it('resolves with verified contract from polygon', async () => {
    const config = Config.default().merge({
      networks: {
        polygon: {
          network_id: 137
        }
      },
      network: "polygon",
    });
    //asserting that polygon url and contract address is passed as args
    stubber("https://api.polygonscan.com/api", '0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398', fixture.polygonData)
    //@ts-ignore
    axios.get.callThrough();
    const result = await fetchAndCompile('0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398', config)
    let contractName = result.sourceInfo.contractName
    //assert contract name is correct 
    assert.equal(contractName, "GrowthVault")
    //assert contract name is not undefined
    assert.notEqual(contractName, undefined)
    //@ts-ignore
    axios.get.restore()
  });
});