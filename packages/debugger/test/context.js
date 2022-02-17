import debugModule from "debug";
const debug = debugModule("debugger:test:context");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import sessionSelector from "lib/session/selectors";

const __OUTER = `
pragma solidity ^0.8.0;

import "./InnerContract.sol";

contract OuterContract {
  event Outer();

  InnerContract inner;

  constructor(address _inner) {
    inner = InnerContract(_inner);
  }

  function run() public {
    inner.run();

    emit Outer();
  }
}
`;

const __INNER = `
pragma solidity ^0.8.0;

contract InnerContract {
  event Inner();

  function run() public {
    emit Inner();
  }
}
`;

const __IMMUTABLE = `
pragma solidity ^0.8.0;

contract ImmutableTest {
  uint immutable x = 35;
  function run() public {
    TestLibrary.shout(x);
  }
}

library TestLibrary {
  event Shout(uint);
  function shout(uint x) external {
    emit Shout(x);
  }
}
`;

const __CREATION = `
pragma solidity ^0.8.0;

contract CreationTest {
  function run() public {
    new Created(1);
  }
}

contract Created {
  uint it;
  constructor(uint x) {
    it = x;
  }
}
`;

const __YUL_IMMUTABLE = `
object "YulImmutableTest" {
  code {
    let size := datasize("runtime")
    let offset := dataoffset("runtime")
    setimmutable(offset, "secret", 1)
    datacopy(0, offset, size)
    return(0, size)
  }
  object "runtime" {
    code {
      mstore(
        0,
        xor(
          loadimmutable("secret"),
          linkersymbol("project:/contracts/ImmutableTest.sol:TestLibrary")
        )
      )
      return(0, 0x20)
    }
  }
}
`;

const __MIGRATION = `
let OuterContract = artifacts.require("OuterContract");
let InnerContract = artifacts.require("InnerContract");
let ImmutableTest = artifacts.require("ImmutableTest");
let TestLibrary = artifacts.require("TestLibrary");
let CreationTest = artifacts.require("CreationTest");
let YulImmutableTest = artifacts.require("YulImmutableTest");

module.exports = async function(deployer) {
  await deployer.deploy(InnerContract);
  const inner = await InnerContract.deployed();
  await deployer.deploy(OuterContract, inner.address);
  await deployer.deploy(TestLibrary);
  await deployer.link(TestLibrary, ImmutableTest);
  await deployer.deploy(ImmutableTest);
  await deployer.deploy(CreationTest);
  await deployer.link(TestLibrary, YulImmutableTest);
  await deployer.deploy(YulImmutableTest);
};
`;

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

let sources = {
  "OuterLibrary.sol": __OUTER,
  "InnerContract.sol": __INNER,
  "ImmutableTest.sol": __IMMUTABLE,
  "CreationTest.sol": __CREATION,
  "YulImmutableTest.yul": __YUL_IMMUTABLE
};

describe("Contexts", function () {
  let provider;
  let abstractions;
  let compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      gasLimit: 7000000,
      logging: {
        quiet: true
      },
      miner: {
        instamine: "strict"
      }
    });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("returns view of addresses affected", async function () {
    let outer = await abstractions.OuterContract.deployed();
    let inner = await abstractions.InnerContract.deployed();

    // run outer contract method
    let result = await outer.run();

    assert.lengthOf(result.receipt.rawLogs, 2, "There should be two logs");

    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });
    debug("debugger ready");

    let affectedInstances = bugger.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    let affectedAddresses = Object.keys(affectedInstances);

    assert.equal(affectedAddresses.length, 2);

    assert.include(
      affectedAddresses,
      outer.address,
      "OuterContract should be an affected address"
    );

    assert.include(
      affectedAddresses,
      inner.address,
      "InnerContract should be an affected address"
    );
  });

  it("correctly identifies context in presence of libraries and immutables", async function () {
    let ImmutableTest = await abstractions.ImmutableTest.deployed();
    let address = ImmutableTest.address;
    let TestLibrary = await abstractions.TestLibrary.deployed();
    let libraryAddress = TestLibrary.address;

    // run outer contract method
    let result = await ImmutableTest.run();

    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });
    debug("debugger ready");

    let affectedInstances = bugger.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    assert.property(affectedInstances, address);
    assert.equal(affectedInstances[address].contractName, "ImmutableTest");
    assert.property(affectedInstances, libraryAddress);
    assert.equal(affectedInstances[libraryAddress].contractName, "TestLibrary");
  });

  it("correctly identifies context in presence of linkersymbols and immutables (Yul)", async function () {
    let ImmutableTest = await abstractions.YulImmutableTest.deployed();
    let address = ImmutableTest.address;

    let result = await ImmutableTest.sendTransaction({ data: "0x" });
    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });
    debug("debugger ready");

    let affectedInstances = bugger.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    assert.property(affectedInstances, address);
    assert.equal(affectedInstances[address].contractName, "YulImmutableTest");
  });

  it("determines encoded constructor arguments for creations", async function () {
    let CreationTest = await abstractions.CreationTest.deployed();
    let address = CreationTest.address;

    let result = await CreationTest.run();
    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });
    debug("debugger ready");

    let affectedInstances = bugger.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    //just some sanity checks
    assert.lengthOf(Object.keys(affectedInstances), 2);
    assert.property(affectedInstances, address);
    assert.equal(affectedInstances[address].contractName, "CreationTest");
    //now...
    let createdAddress = Object.keys(affectedInstances).find(
      newAddress => newAddress !== address
    );
    assert.equal(affectedInstances[createdAddress].contractName, "Created");
    assert.equal(
      affectedInstances[createdAddress].constructorArgs,
      "1".padStart(64, "0")
    );
  });
});
