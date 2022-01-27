import debugModule from "debug";
const debug = debugModule("fetch-and-compile:test");

import assert from "assert";
import "mocha";
import Config from "@truffle/config";
import { fetchAndCompile, fetchAndCompileMultiple } from "../lib/index";
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

describe("Etherscan single-source Solidity case", function () {
  it("verifies contract from mainnet", async function () {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet",
      sourceFetchers: ["etherscan"]
    });
    const address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const expectedName = "UniswapV2Router02";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "etherscan");
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
  });

  it("verifies contract from goerli", async function () {
    const config = Config.default().merge({
      networks: {
        goerli: {
          network_id: 5
        }
      },
      network: "goerli",
      sourceFetchers: ["etherscan"]
    });
    const address = "0xeBC990735Aafd169415D675B6e90aB901f8BDae1";
    const expectedName = "ExternalTestSingle";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "etherscan");
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
  });

  it("verifies contract from arbitrum", async function () {
    const config = Config.default().merge({
      networks: {
        arbitrum: {
          network_id: 42161
        }
      },
      network: "arbitrum",
      sourceFetchers: ["etherscan"]
    });
    const address = "0x2B52D1B2b359eA39536069D8c6f2a3CFE3a09c31";
    const expectedName = "Storage";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "etherscan");
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
  });

  it("verifies contract from polygon", async function () {
    const config = Config.default().merge({
      networks: {
        polygon: {
          network_id: 137
        }
      },
      network: "polygon",
      sourceFetchers: ["etherscan"]
    });
    const address = "0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398";
    const expectedName = "GrowthVault";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "etherscan");
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
  });
});

describe("Etherscan Solidity multi-source and JSON cases", function () {
  it("verifies Etherscan multi-source contract", async function () {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet",
      sourceFetchers: ["etherscan"]
    });
    const address = "0x60BB16c4A931b1a0B8A7D945C651DD90f41D42Cf";
    const expectedName = "ERC20";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "etherscan");
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
  });

  it("verifies Etherscan JSON-format contract", async function () {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet",
      sourceFetchers: ["etherscan"]
    });
    const address = "0xede17dF1a202Ca498a822151079648aCa96e2633";
    const expectedName = "L1StandardBridge";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "etherscan");
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
  });
});

describe("Sourcify cases", function () {
  it("verifies mainnet Sourcify contract, full match", async function () {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet",
      sourceFetchers: ["sourcify"]
    });
    const address = "0xa300126AaFD90F59B35Fd47C1dc4D4563545Cf1e";
    const expectedName = "Forwarder";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "sourcify");
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
  });

  it("verifies mainnet Sourcify contract, partial match", async function () {
    const config = Config.default().merge({
      networks: {
        mainnet: {
          network_id: 1
        }
      },
      network: "mainnet",
      sourceFetchers: ["sourcify"]
    });
    const address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const expectedName = "WETH9";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "sourcify");
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
  });

  it("verifies goerli Sourcify contract with special characters in path", async function () {
    const config = Config.default().merge({
      networks: {
        goerli: {
          network_id: 5
        }
      },
      network: "goerli",
      sourceFetchers: ["sourcify"]
    });
    const address = "0x18019753569c1fa1536f11DBFd80F373D2e05728";
    const expectedName = "ExternalTestWacky";
    const result = await fetchAndCompile(address, config);
    assert.equal(result.fetchedVia, "sourcify");
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
    assert.equal(Object.keys(failures).length, 0); //there should be no failures
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
