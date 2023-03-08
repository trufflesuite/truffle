import debugModule from "debug";
const debug = debugModule("fetch-and-compile:test");

import { assert } from "chai";
import "mocha";
import Config from "@truffle/config";
import {
  fetchAndCompile,
  fetchAndCompileMultiple,
  getSupportedNetworks
} from "../lib/index";
import axios from "axios";
import sinon from "sinon";
import path from "path";
import fs from "fs";
const { etherscanFixture }: any = require("./fixture.js");

//used by the sourcify fake
class NotFoundError extends Error {
  public response: { status: number };
  constructor() {
    super();
    this.response = { status: 404 };
  }
}

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
  sinon
    .stub(axios, "request")
    .withArgs(
      sinon.match.has("url", sinon.match(/^https:\/\/repo\.sourcify\.dev\//))
    )
    .callsFake(async function (requestConfig) {
      if (requestConfig === undefined) {
        //apologies *again* for the misuse of assertions, but see above
        assert.fail("requestConfig was undefined");
      }
      const { url, responseType } = requestConfig;
      if (url === undefined) {
        //and again...
        assert.fail("requestConfig was undefined");
      }
      const match = url.match(/^https:\/\/repo\.sourcify\.dev\/(.*)/);
      if (!match) {
        //this can't happen, but TS doesn't know that
        assert.fail("URL didn't match despite matching");
      }
      const filePath = path.join(__dirname, "./sources/sourcify", match[1]);
      debug("filePath: %s", filePath);
      if (!fs.existsSync(filePath)) {
        debug("throwing!");
        throw new NotFoundError();
      }
      const contents = fs.readFileSync(filePath, "utf8");
      return responseType === "json"
        ? { data: JSON.parse(contents) }
        : { data: contents };
    });
  //TS can't detect that is a sinon stub so we have to use ts-ignore
  //@ts-ignore
  axios.get.callThrough();
  //@ts-ignore
  axios.request.callThrough();
});

afterEach(function () {
  //restoring stubs
  //TS can't detect that is a sinon stub so we have to use ts-ignore
  //@ts-ignore
  axios.get.restore();
  //@ts-ignore
  axios.request.restore();
});

describe("Supported networks", function () {
  it("Lists supported networks", function () {
    const networks = getSupportedNetworks();
    assert.property(networks, "mainnet");
    assert.notProperty(networks, "completelymadeupnetworkthatwillneverexist");
    assert.deepEqual(networks.mainnet, {
      name: "mainnet",
      networkId: 1,
      chainId: 1,
      fetchers: ["etherscan", "sourcify", "blockscout"]
    });
  });

  it("Lists supported networks for specified fetchers only", function () {
    const networks = getSupportedNetworks(["etherscan"]);
    assert.property(networks, "mainnet");
    assert.notProperty(networks, "sokol-poa"); //suported by sourcify but not etherscan
    assert.deepEqual(networks.mainnet, {
      name: "mainnet",
      networkId: 1,
      chainId: 1,
      fetchers: ["etherscan"] //should not include sourcify if that fetcher not requested
    });
  });
});

describe("Etherscan single-source Solidity case", function () {
  it("verifies contract from mainnet", async function () {
    await runTestBody(
      1,
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "etherscan",
      "UniswapV2Router02"
    );
  });

  it("verifies contract from goerli", async function () {
    await runTestBody(
      5,
      "0xeBC990735Aafd169415D675B6e90aB901f8BDae1",
      "etherscan",
      "ExternalTestSingle"
    );
  });

  it("verifies contract from arbitrum", async function () {
    await runTestBody(
      42161,
      "0x2B52D1B2b359eA39536069D8c6f2a3CFE3a09c31",
      "etherscan",
      "Storage"
    );
  });

  it("verifies contract from polygon", async function () {
    await runTestBody(
      137,
      "0xCF79C5417934ECde6BA055C0119A03380CE28DEC",
      "etherscan",
      "Auction"
    );
  });

  it("verifies contract from polygon mumbai", async function () {
    await runTestBody(
      80001,
      "0xF618d6deB4C4F24776810ec3221dFe211b979B4F",
      "etherscan",
      "HelloWorld"
    );
  });

  it("verifies contract from optimism", async function () {
    await runTestBody(
      10,
      "0xca5f37e6D8bB24c5A7958d5eccE7Bd9Aacc944f2",
      "etherscan",
      "InstaERC20Resolver"
    );
  });

  it("verifies contract from moonbeam", async function () {
    await runTestBody(
      1284,
      "0x23eA13c920aF82353872E36CaE99797fb28a8981",
      "etherscan",
      "TimelockController"
    );
  });

  it("verifies contract from moonriver", async function () {
    await runTestBody(
      1285,
      "0x56f4ca4f9dbb29c9438d9de48bd07f4b7fa765a3",
      "etherscan",
      "ERC1967Proxy"
    );
  });

  it("verifies contract from moonbase alpha", async function () {
    await runTestBody(
      1287,
      "0xf85544ea3dd634ebe9a61d963295b054adb0c803",
      "etherscan",
      "AddressStore"
    );
  });
});

describe("Etherscan Solidity multi-source and JSON cases", function () {
  it("verifies Etherscan multi-source contract", async function () {
    await runTestBody(
      1,
      "0x60BB16c4A931b1a0B8A7D945C651DD90f41D42Cf",
      "etherscan",
      "ERC20"
    );
  });

  it("verifies Etherscan JSON-format contract", async function () {
    await runTestBody(
      1,
      "0xede17dF1a202Ca498a822151079648aCa96e2633",
      "etherscan",
      "L1StandardBridge"
    );
  });
});

describe("Sourcify cases", function () {
  it("verifies mainnet Sourcify contract, full match", async function () {
    await runTestBody(
      1,
      "0xa300126AaFD90F59B35Fd47C1dc4D4563545Cf1e",
      "sourcify",
      "Forwarder"
    );
  });

  it("verifies mainnet Sourcify contract, partial match", async function () {
    await runTestBody(
      1,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "sourcify",
      "WETH9"
    );
  });

  it("verifies goerli Sourcify contract with special characters in path", async function () {
    await runTestBody(
      5,
      "0x18019753569c1fa1536f11DBFd80F373D2e05728",
      "sourcify",
      "ExternalTestWacky"
    );
  });
});

describe("fetchAndCompileMultiple", function () {
  it("verifies contracts from mainnet", async function () {
    //can't use the standard test body for this one!
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet",
      sourceFetchers: ["etherscan"]
    });
    const addresses = [
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
    ];
    const { results, failures } = await fetchAndCompileMultiple(
      addresses,
      config
    );
    assert.isEmpty(failures); //there should be no failures
    const expectedNames = ["UniswapV2Router02", "ENSRegistryWithFallback"];
    for (let i = 0; i < addresses.length; i++) {
      const result = results[addresses[i]];
      assert.equal(result.fetchedVia, "etherscan");
      const contractNameFromSourceInfo = result.sourceInfo.contractName;
      assert.equal(contractNameFromSourceInfo, expectedNames[i]);
      const contractsFromCompilation =
        result.compileResult.compilations[0].contracts;
      assert(
        contractsFromCompilation.some(
          contract => contract.contractName === expectedNames[i]
        )
      );
      assert(
        result.compileResult.contracts.some(
          contract => contract.contractName === expectedNames[i]
        )
      );
    }
  });
});

describe("blockscout fetchAndCompile", async function () {
  // mainnet test blocked by bug in blockscout UI making it impossible to peruse verified contracts
  // TODO uncomment once bug is fixed
  // it("verifies contract from mainnet", async function () {
  //   await runTestBody(
  //   );
  // });
  it.only("verifies contract from zkevm goerli", async function () {
    await runTestBody(
      59140,
      "0x52167ca84d9743CAF71A1aC176eeb177c18F3E37",
      "blockscout",
      "CryptoSchool"
    );
  }),
    it("verifies contract from goerli", async function () {
      await runTestBody(
        5,
        "0x462D3B18b63835f9a472693682514f57344DDEcb",
        "blockscout",
        "ConvertLib"
      );
    });
});

async function runTestBody(
  networkId: number,
  address: string,
  fetcherName: string,
  expectedName: string
) {
  const config = Config.default().merge({
    networks: {
      testnetwork: {
        network_id: networkId
      }
    },
    network: "testnetwork",
    sourceFetchers: [fetcherName]
  });
  const result = await fetchAndCompile(address, config);
  assert.equal(result.fetchedVia, fetcherName);
  const contractNameFromSourceInfo = result.sourceInfo.contractName;
  assert.equal(contractNameFromSourceInfo, expectedName);
  const contractsFromCompilation =
    result.compileResult.compilations[0].contracts;
  assert(
    contractsFromCompilation.some(
      contract => contract.contractName === expectedName
    )
  );
  assert(
    result.compileResult.contracts.some(
      contract => contract.contractName === expectedName
    )
  );
}
