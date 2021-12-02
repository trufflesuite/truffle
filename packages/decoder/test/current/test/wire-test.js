const debug = require("debug")("decoder:test:wire-test");
const assert = require("chai").assert;
const BN = require("bn.js");
const Ganache = require("ganache");
const path = require("path");
const Web3 = require("web3");

const Decoder = require("../../..");
const Codec = require("@truffle/codec");

const { prepareContracts } = require("../../helpers");

describe("Over-the-wire decoding", function () {
  let provider;
  let abstractions;
  let web3;

  let Contracts;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "decoder",
      gasLimit: 7000000,
      vmErrorsOnRPCResponse: false
    });
    web3 = new Web3(provider);
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    const prepared = await prepareContracts(
      provider,
      path.resolve(__dirname, "..")
    );
    abstractions = prepared.abstractions;

    Contracts = [
      abstractions.WireTest,
      abstractions.WireTestParent,
      abstractions.WireTestLibrary,
      abstractions.WireTestAbstract,
      abstractions.WireTestRedHerring
    ];
  });

  it("should correctly decode transactions and events", async function () {
    let deployedContract = await abstractions.WireTest.new(
      true,
      "0xdeadbeef",
      2
    );
    let address = deployedContract.address;
    let constructorHash = deployedContract.transactionHash;

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: Contracts }
    });

    let deployedContractNoConstructor = await abstractions.WireTestParent.new();
    let defaultConstructorHash = deployedContractNoConstructor.transactionHash;

    let emitStuffArgs = [
      {
        x: -1,
        y: "0xdeadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000",
        z: "0xbababa"
      },
      [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002"
      ],
      ["hello", "hi", "hooblypoob"],
      -1
    ];
    let emitStuff = await deployedContract.emitStuff(...emitStuffArgs);
    let emitStuffHash = emitStuff.tx;

    let moreStuffArgs = [address, [8, 8, 8, 7, 8, 8, 8]];
    let moreStuff = await deployedContract.moreStuff(...moreStuffArgs);
    let moreStuffHash = moreStuff.tx;

    let globalTestArgs = [{ x: 3, y: 5 }, 1];
    let globalTest = await deployedContract.globalTest(...globalTestArgs);
    let globalTestHash = globalTest.tx;

    let inheritedArg = [2, 3];
    let inherited = await deployedContract.inherited(inheritedArg);
    let inheritedHash = inherited.tx;

    let indexTestArgs = [7, 89, "hello", "indecipherable", 62];
    let indexTest = await deployedContract.indexTest(...indexTestArgs);

    let libraryTestArg = "zooglyzooglyzooglyzoogly";
    let libraryTest = await deployedContract.libraryTest(libraryTestArg);

    let getter1Args = ["blornst", 1];
    //this function is view so we have to use sendTransaction
    let getterTest1 = await deployedContract.deepStruct.sendTransaction(
      ...getter1Args
    );
    let getterHash1 = getterTest1.tx;

    let getter2Args = [1, "blornst"];
    //this function is view so we have to use sendTransaction
    let getterTest2 = await deployedContract.deepString.sendTransaction(
      ...getter2Args
    );
    let getterHash2 = getterTest2.tx;

    let constructorTx = await web3.eth.getTransaction(constructorHash);
    let emitStuffTx = await web3.eth.getTransaction(emitStuffHash);
    let moreStuffTx = await web3.eth.getTransaction(moreStuffHash);
    let globalTestTx = await web3.eth.getTransaction(globalTestHash);
    let inheritedTx = await web3.eth.getTransaction(inheritedHash);
    let getterTx1 = await web3.eth.getTransaction(getterHash1);
    let getterTx2 = await web3.eth.getTransaction(getterHash2);
    let defaultConstructorTx = await web3.eth.getTransaction(
      defaultConstructorHash
    );

    let constructorDecoding = await decoder.decodeTransaction(constructorTx);
    let emitStuffDecoding = await decoder.decodeTransaction(emitStuffTx);
    let moreStuffDecoding = await decoder.decodeTransaction(moreStuffTx);
    let globalTestDecoding = await decoder.decodeTransaction(globalTestTx);
    let inheritedDecoding = await decoder.decodeTransaction(inheritedTx);
    let getterDecoding1 = await decoder.decodeTransaction(getterTx1);
    let getterDecoding2 = await decoder.decodeTransaction(getterTx2);
    let defaultConstructorDecoding = await decoder.decodeTransaction(
      defaultConstructorTx
    );

    assert.strictEqual(constructorDecoding.kind, "constructor");
    assert.strictEqual(constructorDecoding.decodingMode, "full");
    assert.strictEqual(constructorDecoding.class.typeName, "WireTest");
    assert.lengthOf(constructorDecoding.arguments, 3);
    assert.strictEqual(constructorDecoding.arguments[0].name, "status");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        constructorDecoding.arguments[0].value
      ),
      true
    );
    assert.strictEqual(constructorDecoding.arguments[1].name, "info");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        constructorDecoding.arguments[1].value
      ),
      "0xdeadbeef"
    );
    assert.strictEqual(constructorDecoding.arguments[2].name, "whoknows");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        constructorDecoding.arguments[2].value
      ),
      "WireTest.Ternary.MaybeSo"
    );

    assert.strictEqual(emitStuffDecoding.kind, "function");
    assert.strictEqual(emitStuffDecoding.decodingMode, "full");
    assert.strictEqual(emitStuffDecoding.abi.name, "emitStuff");
    assert.strictEqual(emitStuffDecoding.class.typeName, "WireTest");
    assert.lengthOf(emitStuffDecoding.arguments, 4);
    assert.strictEqual(emitStuffDecoding.arguments[0].name, "p");
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffDecoding.arguments[0].value
      ),
      emitStuffArgs[0]
    );
    assert.strictEqual(emitStuffDecoding.arguments[1].name, "precompiles");
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffDecoding.arguments[1].value
      ),
      emitStuffArgs[1]
    );
    assert.strictEqual(emitStuffDecoding.arguments[2].name, "strings");
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffDecoding.arguments[2].value
      ),
      emitStuffArgs[2]
    );
    assert.strictEqual(emitStuffDecoding.arguments[3].name, "x");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffDecoding.arguments[3].value
      ),
      emitStuffArgs[3]
    );

    assert.strictEqual(moreStuffDecoding.kind, "function");
    assert.strictEqual(moreStuffDecoding.decodingMode, "full");
    assert.strictEqual(moreStuffDecoding.abi.name, "moreStuff");
    assert.strictEqual(moreStuffDecoding.class.typeName, "WireTest");
    assert.lengthOf(moreStuffDecoding.arguments, 2);
    assert.strictEqual(moreStuffDecoding.arguments[0].name, "notThis");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        moreStuffDecoding.arguments[0].value
      ),
      moreStuffArgs[0]
    );
    assert.strictEqual(moreStuffDecoding.arguments[1].name, "bunchOfInts");
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        moreStuffDecoding.arguments[1].value
      ),
      moreStuffArgs[1]
    );

    assert.strictEqual(globalTestDecoding.kind, "function");
    assert.strictEqual(globalTestDecoding.decodingMode, "full");
    assert.strictEqual(globalTestDecoding.abi.name, "globalTest");
    assert.strictEqual(globalTestDecoding.class.typeName, "WireTest");
    assert.lengthOf(globalTestDecoding.arguments, 2);
    assert.strictEqual(globalTestDecoding.arguments[0].name, "s");
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        globalTestDecoding.arguments[0].value
      ),
      globalTestArgs[0]
    );
    assert.strictEqual(globalTestDecoding.arguments[1].name, "e");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        globalTestDecoding.arguments[1].value
      ),
      "GlobalEnum.Yes"
    );

    assert.strictEqual(inheritedDecoding.kind, "function");
    assert.strictEqual(inheritedDecoding.decodingMode, "full");
    assert.strictEqual(inheritedDecoding.abi.name, "inherited");
    assert.strictEqual(inheritedDecoding.class.typeName, "WireTest"); //NOT WireTestParent
    assert.lengthOf(inheritedDecoding.arguments, 1);
    assert.isUndefined(inheritedDecoding.arguments[0].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        inheritedDecoding.arguments[0].value
      ),
      inheritedArg
    );

    assert.strictEqual(defaultConstructorDecoding.kind, "constructor");
    assert.strictEqual(defaultConstructorDecoding.decodingMode, "full");
    assert.strictEqual(
      defaultConstructorDecoding.class.typeName,
      "WireTestParent"
    );
    assert.isEmpty(defaultConstructorDecoding.arguments);

    assert.strictEqual(getterDecoding1.kind, "function");
    assert.strictEqual(getterDecoding1.decodingMode, "full");
    assert.strictEqual(getterDecoding1.abi.name, "deepStruct");
    assert.strictEqual(getterDecoding1.class.typeName, "WireTest");
    assert.lengthOf(getterDecoding1.arguments, 2);
    assert.isUndefined(getterDecoding1.arguments[0].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        getterDecoding1.arguments[0].value
      ),
      getter1Args[0]
    );
    assert.isUndefined(getterDecoding1.arguments[1].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        getterDecoding1.arguments[1].value
      ),
      getter1Args[1]
    );

    assert.strictEqual(getterDecoding2.kind, "function");
    assert.strictEqual(getterDecoding2.decodingMode, "full");
    assert.strictEqual(getterDecoding2.abi.name, "deepString");
    assert.strictEqual(getterDecoding2.class.typeName, "WireTest");
    assert.lengthOf(getterDecoding2.arguments, 2);
    assert.isUndefined(getterDecoding2.arguments[0].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        getterDecoding2.arguments[0].value
      ),
      getter2Args[0]
    );
    assert.isUndefined(getterDecoding2.arguments[1].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        getterDecoding2.arguments[1].value
      ),
      getter2Args[1]
    );

    //now for events!
    let constructorBlock = constructorTx.blockNumber;
    let emitStuffBlock = emitStuff.receipt.blockNumber;
    let moreStuffBlock = moreStuff.receipt.blockNumber;
    let globalTestBlock = globalTest.receipt.blockNumber;
    let inheritedBlock = inherited.receipt.blockNumber;
    let indexTestBlock = indexTest.receipt.blockNumber;
    let libraryTestBlock = libraryTest.receipt.blockNumber;

    try {
      //due to web3's having ethers's crappy decoder built in,
      //we have to put this in a try block to catch the error
      await deployedContract.danger();
    } catch (_) {
      //discard the error!
    }

    let constructorEvents = await decoder.events({
      fromBlock: constructorBlock,
      toBlock: constructorBlock
    });
    let emitStuffEvents = await decoder.events({
      fromBlock: emitStuffBlock,
      toBlock: emitStuffBlock
    });
    let moreStuffEvents = await decoder.events({
      fromBlock: moreStuffBlock,
      toBlock: moreStuffBlock
    });
    let globalTestEvents = await decoder.events({
      fromBlock: globalTestBlock,
      toBlock: globalTestBlock
    });
    let inheritedEvents = await decoder.events({
      fromBlock: inheritedBlock,
      toBlock: inheritedBlock
    });
    let indexTestEvents = await decoder.events({
      fromBlock: indexTestBlock,
      toBlock: indexTestBlock
    });
    let libraryTestEvents = await decoder.events({
      fromBlock: libraryTestBlock,
      toBlock: libraryTestBlock
    });
    //HACK -- since danger was last, we can just ask for the
    //events from the latest block
    let dangerEvents = await decoder.events();

    assert.lengthOf(constructorEvents, 1);
    let constructorEventDecodings = constructorEvents[0].decodings;
    assert.lengthOf(constructorEventDecodings, 1);
    let constructorEventDecoding = constructorEventDecodings[0];

    assert.lengthOf(emitStuffEvents, 1);
    let emitStuffEventDecodings = emitStuffEvents[0].decodings;
    assert.lengthOf(emitStuffEventDecodings, 1);
    let emitStuffEventDecoding = emitStuffEventDecodings[0];

    assert.lengthOf(moreStuffEvents, 1);
    let moreStuffEventDecodings = moreStuffEvents[0].decodings;
    assert.lengthOf(moreStuffEventDecodings, 1);
    let moreStuffEventDecoding = moreStuffEventDecodings[0];

    assert.lengthOf(globalTestEvents, 1);
    let globalTestEventDecodings = globalTestEvents[0].decodings;
    assert.lengthOf(globalTestEventDecodings, 1);
    let globalTestEventDecoding = globalTestEventDecodings[0];

    assert.lengthOf(inheritedEvents, 1);
    let inheritedEventDecodings = inheritedEvents[0].decodings;
    assert.lengthOf(inheritedEventDecodings, 1);
    let inheritedEventDecoding = inheritedEventDecodings[0];

    assert.lengthOf(indexTestEvents, 1);
    let indexTestEventDecodings = indexTestEvents[0].decodings;
    assert.lengthOf(indexTestEventDecodings, 1);
    let indexTestEventDecoding = indexTestEventDecodings[0];

    assert.lengthOf(libraryTestEvents, 1);
    let libraryTestEventDecodings = libraryTestEvents[0].decodings;
    assert.lengthOf(libraryTestEventDecodings, 1);
    let libraryTestEventDecoding = libraryTestEventDecodings[0];

    assert.lengthOf(dangerEvents, 1);
    let dangerEventDecodings = dangerEvents[0].decodings;
    assert.lengthOf(dangerEventDecodings, 1);
    let dangerEventDecoding = dangerEventDecodings[0];

    assert.strictEqual(constructorEventDecoding.kind, "event");
    assert.strictEqual(constructorEventDecoding.decodingMode, "full");
    assert.strictEqual(constructorEventDecoding.class.typeName, "WireTest");
    assert.strictEqual(constructorEventDecoding.definedIn.typeName, "WireTest");
    assert.strictEqual(constructorEventDecoding.abi.name, "ConstructorEvent");
    assert.lengthOf(constructorEventDecoding.arguments, 3);
    assert.strictEqual(constructorEventDecoding.arguments[0].name, "bit");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        constructorEventDecoding.arguments[0].value
      ),
      true
    );
    assert.isUndefined(constructorEventDecoding.arguments[1].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        constructorEventDecoding.arguments[1].value
      ),
      "0xdeadbeef"
    );
    assert.isUndefined(constructorEventDecoding.arguments[2].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        constructorEventDecoding.arguments[2].value
      ),
      "WireTest.Ternary.MaybeSo"
    );

    assert.strictEqual(emitStuffEventDecoding.kind, "event");
    assert.strictEqual(emitStuffEventDecoding.decodingMode, "full");
    assert.strictEqual(emitStuffEventDecoding.abi.name, "EmitStuff");
    assert.strictEqual(emitStuffEventDecoding.class.typeName, "WireTest");
    assert.strictEqual(emitStuffEventDecoding.definedIn.typeName, "WireTest");
    assert.lengthOf(emitStuffEventDecoding.arguments, 4);
    assert.isUndefined(emitStuffEventDecoding.arguments[0].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffEventDecoding.arguments[0].value
      ),
      emitStuffArgs[0]
    );
    assert.isUndefined(emitStuffEventDecoding.arguments[1].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffEventDecoding.arguments[1].value
      ),
      emitStuffArgs[1]
    );
    assert.isUndefined(emitStuffEventDecoding.arguments[2].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffEventDecoding.arguments[2].value
      ),
      emitStuffArgs[2]
    );
    assert.isUndefined(emitStuffEventDecoding.arguments[3].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        emitStuffEventDecoding.arguments[3].value
      ),
      emitStuffArgs[3]
    );

    assert.strictEqual(moreStuffEventDecoding.kind, "event");
    assert.strictEqual(moreStuffEventDecoding.decodingMode, "full");
    assert.strictEqual(moreStuffEventDecoding.abi.name, "MoreStuff");
    assert.strictEqual(moreStuffEventDecoding.class.typeName, "WireTest");
    assert.strictEqual(moreStuffEventDecoding.definedIn.typeName, "WireTest");
    assert.lengthOf(moreStuffEventDecoding.arguments, 2);
    assert.isUndefined(moreStuffEventDecoding.arguments[0].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        moreStuffEventDecoding.arguments[0].value
      ),
      moreStuffArgs[0]
    );
    assert.strictEqual(moreStuffEventDecoding.arguments[1].name, "data");
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        moreStuffEventDecoding.arguments[1].value
      ),
      moreStuffArgs[1]
    );

    assert.strictEqual(globalTestEventDecoding.kind, "event");
    assert.strictEqual(globalTestEventDecoding.decodingMode, "full");
    assert.strictEqual(globalTestEventDecoding.abi.name, "Globals");
    assert.strictEqual(globalTestEventDecoding.class.typeName, "WireTest");
    assert.strictEqual(globalTestEventDecoding.definedIn.typeName, "WireTest");
    assert.lengthOf(globalTestEventDecoding.arguments, 2);
    assert.isUndefined(globalTestEventDecoding.arguments[0].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        globalTestEventDecoding.arguments[0].value
      ),
      globalTestArgs[0]
    );
    assert.isUndefined(globalTestEventDecoding.arguments[1].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        globalTestEventDecoding.arguments[1].value
      ),
      "GlobalEnum.Yes"
    );

    assert.strictEqual(inheritedEventDecoding.kind, "event");
    assert.strictEqual(inheritedEventDecoding.decodingMode, "full");
    assert.strictEqual(inheritedEventDecoding.abi.name, "Done");
    assert.strictEqual(inheritedEventDecoding.class.typeName, "WireTest");
    assert.strictEqual(
      inheritedEventDecoding.definedIn.typeName,
      "WireTestParent"
    );
    assert.isEmpty(inheritedEventDecoding.arguments);

    assert.strictEqual(indexTestEventDecoding.kind, "event");
    assert.strictEqual(indexTestEventDecoding.decodingMode, "full");
    assert.strictEqual(indexTestEventDecoding.abi.name, "HasIndices");
    assert.strictEqual(indexTestEventDecoding.class.typeName, "WireTest");
    assert.strictEqual(indexTestEventDecoding.definedIn.typeName, "WireTest");
    assert.lengthOf(indexTestEventDecoding.arguments, 5);
    assert.isUndefined(indexTestEventDecoding.arguments[0].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        indexTestEventDecoding.arguments[0].value
      ),
      indexTestArgs[0]
    );
    assert.isUndefined(indexTestEventDecoding.arguments[1].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        indexTestEventDecoding.arguments[1].value
      ),
      indexTestArgs[1]
    );
    assert.isUndefined(indexTestEventDecoding.arguments[2].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        indexTestEventDecoding.arguments[2].value
      ),
      indexTestArgs[2]
    );
    assert.isUndefined(indexTestEventDecoding.arguments[3].name);
    assert.isUndefined(
      Codec.Format.Utils.Inspect.unsafeNativize(
        indexTestEventDecoding.arguments[3].value
      ) //can't decode indexed reference type!
    );
    assert.isUndefined(indexTestEventDecoding.arguments[4].name);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        indexTestEventDecoding.arguments[4].value
      ),
      indexTestArgs[4]
    );

    assert.strictEqual(libraryTestEventDecoding.kind, "event");
    assert.strictEqual(libraryTestEventDecoding.decodingMode, "full");
    assert.strictEqual(libraryTestEventDecoding.abi.name, "LibraryEvent");
    assert.strictEqual(
      libraryTestEventDecoding.class.typeName,
      "WireTestLibrary"
    );
    assert.strictEqual(
      libraryTestEventDecoding.definedIn.typeName,
      "WireTestLibrary"
    );
    assert.lengthOf(libraryTestEventDecoding.arguments, 1);
    assert.isUndefined(libraryTestEventDecoding.arguments[0].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        libraryTestEventDecoding.arguments[0].value
      ),
      libraryTestArg
    );

    assert.strictEqual(dangerEventDecoding.kind, "event");
    assert.strictEqual(dangerEventDecoding.decodingMode, "full");
    assert.strictEqual(dangerEventDecoding.abi.name, "Danger");
    assert.lengthOf(dangerEventDecoding.arguments, 1);
    assert.isUndefined(dangerEventDecoding.arguments[0].name);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        dangerEventDecoding.arguments[0].value
      ),
      `WireTest(${address}).danger`
    );
  });

  it("disambiguates events when possible and not when impossible", async function () {
    let deployedContract = await abstractions.WireTest.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: Contracts }
    });

    //HACK HACK -- we're going to repeatedly apply the hack from above
    //because ethers also can't handle ambiguous events
    try {
      await deployedContract.ambiguityTest();
    } catch (_) {
      //discard the error!
    }
    let ambiguityTestEvents = await decoder.events();
    try {
      await deployedContract.unambiguityTest();
    } catch (_) {
      //discard the error!
    }
    let unambiguityTestEvents = await decoder.events();

    assert.lengthOf(ambiguityTestEvents, 1);
    let ambiguityTestEventDecodings = ambiguityTestEvents[0].decodings;
    assert.lengthOf(ambiguityTestEventDecodings, 2); //it's ambiguous!
    //contract should always come before libraries
    let ambiguityTestContractDecoding = ambiguityTestEventDecodings[0];
    let ambiguityTestLibraryDecoding = ambiguityTestEventDecodings[1];

    assert.lengthOf(unambiguityTestEvents, 4);
    for (let event of unambiguityTestEvents) {
      assert.lengthOf(event.decodings, 1); //they're unambiguous!
    }
    let unambiguousDecodings = unambiguityTestEvents.map(
      ({ decodings }) => decodings[0]
    );
    assert.strictEqual(ambiguityTestContractDecoding.kind, "event");
    assert.strictEqual(
      ambiguityTestContractDecoding.abi.name,
      "AmbiguousEvent"
    );
    assert.strictEqual(
      ambiguityTestContractDecoding.class.typeName,
      "WireTest"
    );
    assert.lengthOf(ambiguityTestContractDecoding.arguments, 2);
    assert.isUndefined(
      Codec.Format.Utils.Inspect.unsafeNativize(
        ambiguityTestContractDecoding.arguments[0].value
      )
    );
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        ambiguityTestContractDecoding.arguments[1].value
      ),
      [32, 3, 17, 18, 19]
    );

    assert.strictEqual(ambiguityTestLibraryDecoding.kind, "event");
    assert.strictEqual(ambiguityTestLibraryDecoding.abi.name, "AmbiguousEvent");
    assert.strictEqual(
      ambiguityTestLibraryDecoding.class.typeName,
      "WireTestLibrary"
    );
    assert.lengthOf(ambiguityTestLibraryDecoding.arguments, 2);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        ambiguityTestLibraryDecoding.arguments[0].value
      ),
      [17, 18, 19]
    );
    assert.isUndefined(
      Codec.Format.Utils.Inspect.unsafeNativize(
        ambiguityTestLibraryDecoding.arguments[1].value
      )
    );

    for (let decoding of unambiguousDecodings) {
      assert.strictEqual(decoding.kind, "event");
      assert.strictEqual(decoding.abi.name, "AmbiguousEvent");
    }

    assert.strictEqual(unambiguousDecodings[0].class.typeName, "WireTest");
    assert.lengthOf(unambiguousDecodings[0].arguments, 2);
    assert.isUndefined(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[0].arguments[0].value
      )
    );
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[0].arguments[1].value
      ),
      [32, 1e12, 17, 18, 19]
    );

    assert.strictEqual(unambiguousDecodings[1].class.typeName, "WireTest");
    assert.lengthOf(unambiguousDecodings[1].arguments, 2);
    assert.isUndefined(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[1].arguments[0].value
      )
    );
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[1].arguments[1].value
      ),
      [32, 3, 257, 257, 257]
    );

    assert.strictEqual(unambiguousDecodings[2].class.typeName, "WireTest");
    assert.lengthOf(unambiguousDecodings[2].arguments, 2);
    assert.isUndefined(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[2].arguments[0].value
      )
    );
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[2].arguments[1].value
      ),
      [64, 0, 2, 1, 1]
    );

    assert.strictEqual(
      unambiguousDecodings[3].class.typeName,
      "WireTestLibrary"
    );
    assert.lengthOf(unambiguousDecodings[3].arguments, 2);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[3].arguments[0].value
      ),
      [107]
    );
    assert.isUndefined(
      Codec.Format.Utils.Inspect.unsafeNativize(
        unambiguousDecodings[3].arguments[1].value
      )
    );
  });

  it("Handles anonymous events", async function () {
    let deployedContract = await abstractions.WireTest.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: Contracts }
    });

    //thankfully, ethers ignores anonymous events,
    //so we don't need to use that hack here
    let anonymousTest = await deployedContract.anonymousTest();
    let block = anonymousTest.blockNumber;
    let anonymousTestEvents = await decoder.events({
      fromBlock: block,
      toBlock: block
    });
    //also, let's do a test with a specified name
    let specifiedNameEvents = await decoder.events({
      name: "AnonUint8s",
      fromBlock: block,
      toBlock: block
    });

    assert.lengthOf(anonymousTestEvents, 4);

    assert.lengthOf(anonymousTestEvents[0].decodings, 1);
    assert.strictEqual(anonymousTestEvents[0].decodings[0].kind, "anonymous");
    assert.strictEqual(
      anonymousTestEvents[0].decodings[0].abi.name,
      "AnonUints"
    );
    assert.strictEqual(
      anonymousTestEvents[0].decodings[0].class.typeName,
      "WireTest"
    );
    assert.lengthOf(anonymousTestEvents[0].decodings[0].arguments, 4);
    assert.deepEqual(
      anonymousTestEvents[0].decodings[0].arguments.map(({ value }) =>
        Codec.Format.Utils.Inspect.unsafeNativize(value)
      ),
      [257, 1, 1, 1]
    );

    assert.lengthOf(anonymousTestEvents[1].decodings, 2);
    assert.strictEqual(anonymousTestEvents[1].decodings[0].kind, "anonymous");
    assert.strictEqual(
      anonymousTestEvents[1].decodings[0].abi.name,
      "AnonUints"
    );
    assert.strictEqual(
      anonymousTestEvents[1].decodings[0].class.typeName,
      "WireTest"
    );
    assert.lengthOf(anonymousTestEvents[1].decodings[0].arguments, 4);
    assert.deepEqual(
      anonymousTestEvents[1].decodings[0].arguments.map(({ value }) =>
        Codec.Format.Utils.Inspect.unsafeNativize(value)
      ),
      [1, 2, 3, 4]
    );
    assert.strictEqual(anonymousTestEvents[1].decodings[1].kind, "anonymous");
    assert.strictEqual(
      anonymousTestEvents[1].decodings[1].abi.name,
      "AnonUint8s"
    );
    assert.strictEqual(
      anonymousTestEvents[1].decodings[1].class.typeName,
      "WireTestLibrary"
    );
    assert.lengthOf(anonymousTestEvents[1].decodings[1].arguments, 4);
    assert.deepEqual(
      anonymousTestEvents[1].decodings[1].arguments.map(({ value }) =>
        Codec.Format.Utils.Inspect.unsafeNativize(value)
      ),
      [1, 2, 3, 4]
    );

    assert.lengthOf(anonymousTestEvents[2].decodings, 2);
    assert.strictEqual(anonymousTestEvents[2].decodings[0].kind, "event");
    assert.strictEqual(anonymousTestEvents[2].decodings[0].abi.name, "NonAnon");
    assert.strictEqual(
      anonymousTestEvents[2].decodings[0].class.typeName,
      "WireTest"
    );
    assert.lengthOf(anonymousTestEvents[2].decodings[0].arguments, 3);
    assert.deepEqual(
      anonymousTestEvents[2].decodings[0].arguments.map(({ value }) =>
        Codec.Format.Utils.Inspect.unsafeNativize(value)
      ),
      [1, 2, 3]
    );
    let selector = anonymousTestEvents[2].decodings[0].selector;
    assert.strictEqual(anonymousTestEvents[2].decodings[1].kind, "anonymous");
    assert.strictEqual(
      anonymousTestEvents[2].decodings[1].abi.name,
      "AnonUints"
    );
    assert.strictEqual(
      anonymousTestEvents[2].decodings[1].class.typeName,
      "WireTest"
    );
    assert.lengthOf(anonymousTestEvents[2].decodings[1].arguments, 4);
    assert.deepEqual(
      anonymousTestEvents[2].decodings[1].arguments
        .slice(1)
        .map(({ value }) => Codec.Format.Utils.Inspect.unsafeNativize(value)),
      [1, 2, 3]
    );
    assert(
      anonymousTestEvents[2].decodings[1].arguments[0].value.value.asBN.eq(
        new BN(selector.slice(2), 16)
      )
    );

    assert.lengthOf(anonymousTestEvents[3].decodings, 1);
    assert.strictEqual(anonymousTestEvents[3].decodings[0].kind, "anonymous");
    assert.strictEqual(
      anonymousTestEvents[3].decodings[0].abi.name,
      "ObviouslyAnon"
    );
    assert.strictEqual(
      anonymousTestEvents[3].decodings[0].class.typeName,
      "WireTest"
    );
    assert.lengthOf(anonymousTestEvents[3].decodings[0].arguments, 1);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        anonymousTestEvents[3].decodings[0].arguments[0].value
      ),
      "0xfe"
    );

    //now, let's test the specified name events
    assert.lengthOf(specifiedNameEvents, 1);
    let specifiedNameEvent = specifiedNameEvents[0];
    assert.lengthOf(specifiedNameEvent.decodings, 1);
    let specifiedNameDecoding = specifiedNameEvent.decodings[0];
    assert.strictEqual(specifiedNameDecoding.kind, "anonymous");
    assert.strictEqual(specifiedNameDecoding.abi.name, "AnonUint8s");
    assert.strictEqual(specifiedNameDecoding.class.typeName, "WireTestLibrary");
    assert.lengthOf(specifiedNameDecoding.arguments, 4);
    assert.deepEqual(
      specifiedNameDecoding.arguments.map(({ value }) =>
        Codec.Format.Utils.Inspect.unsafeNativize(value)
      ),
      [1, 2, 3, 4]
    );
  });

  it("respects the extras option", async function () {
    const deployedContract = await abstractions.WireTest.deployed();
    const delegate = await abstractions.WireTestRedHerring.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: Contracts }
    });

    const extrasTestNone = await deployedContract.extrasTestNone(
      delegate.address
    );
    const extrasTestSome = await deployedContract.extrasTestSome();

    const noneBlock = extrasTestNone.receipt.blockNumber;
    const someBlock = extrasTestSome.receipt.blockNumber;

    const noneTestEvents = await decoder.events({
      fromBlock: noneBlock,
      toBlock: noneBlock
    });

    const someTestEvents = await decoder.events({
      fromBlock: someBlock,
      toBlock: someBlock
    });

    const noneTestEventsExtras = await decoder.events({
      fromBlock: noneBlock,
      toBlock: noneBlock,
      extras: "on"
    });

    const someTestEventsExtras = await decoder.events({
      fromBlock: someBlock,
      toBlock: someBlock,
      extras: "on"
    });

    const noneTestEventsMaybe = await decoder.events({
      fromBlock: noneBlock,
      toBlock: noneBlock,
      extras: "necessary"
    });

    const someTestEventsMaybe = await decoder.events({
      fromBlock: someBlock,
      toBlock: someBlock,
      extras: "necessary"
    });

    assert.lengthOf(someTestEvents, 1);
    assert.lengthOf(someTestEventsExtras, 1);
    assert.lengthOf(someTestEventsMaybe, 1);
    assert.lengthOf(noneTestEvents, 1);
    assert.lengthOf(noneTestEventsExtras, 1);
    assert.lengthOf(noneTestEventsMaybe, 1);

    const someDecodings = someTestEvents[0].decodings;
    const someDecodingsExtras = someTestEventsExtras[0].decodings;
    const someDecodingsMaybe = someTestEventsMaybe[0].decodings;
    const noneDecodings = noneTestEvents[0].decodings;
    const noneDecodingsExtras = noneTestEventsExtras[0].decodings;
    const noneDecodingsMaybe = noneTestEventsMaybe[0].decodings;

    testNoneWithoutExtras(noneDecodings);
    testNoneWithExtras(noneDecodingsExtras);
    testNoneWithExtras(noneDecodingsMaybe); //with no ordinary interpretations, extras should appear
    testSomeWithoutExtras(someDecodings);
    testSomeWithExtras(someDecodingsExtras);
    testSomeWithoutExtras(someDecodingsMaybe); //there are no ordinary interpretations, so no extras
  });

  it("Decodes return values", async function () {
    const { WireTest } = abstractions;
    let deployedContract = await WireTest.deployed();

    const decoder = await Decoder.forContract(WireTest, {
      projectInfo: { artifacts: Contracts }
    });

    let abiEntry = WireTest.abi.find(
      ({ type, name }) => type === "function" && name === "returnsStuff"
    );
    let selector = web3.eth.abi.encodeFunctionSignature(abiEntry);

    //we need the raw return data, and contract.call() does not exist yet,
    //so we're going to have to use web3.eth.call()

    let data = await web3.eth.call({
      to: deployedContract.address,
      data: selector
    });

    let decodings = await decoder.decodeReturnValue(abiEntry, data);
    assert.lengthOf(decodings, 1);
    let decoding = decodings[0];
    assert.strictEqual(decoding.kind, "return");
    assert.strictEqual(decoding.decodingMode, "full");
    assert.lengthOf(decoding.arguments, 3);
    assert.deepEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decoding.arguments[0].value),
      {
        x: -1,
        y: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        z: "0xdeadbeef"
      }
    );
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decoding.arguments[1].value),
      "WireTest.Ternary.No"
    );
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decoding.arguments[2].value),
      -1
    );

    //now: let's try decoding a self-destruct :D
    let sdAbiEntry = WireTest.abi.find(
      ({ type, name }) => type === "function" && name === "boom"
    );
    let sdSelector = web3.eth.abi.encodeFunctionSignature(sdAbiEntry);

    //we need the raw return data, and contract.call() does not exist yet,
    //so we're going to have to use web3.eth.call()

    let sdData = await web3.eth.call({
      to: deployedContract.address,
      data: sdSelector
    });

    let sdDecodings = await decoder.decodeReturnValue(sdAbiEntry, sdData, {
      status: true
    });

    assert.lengthOf(sdDecodings, 1);
    assert.strictEqual(sdDecodings[0].kind, "selfdestruct");
    assert.strictEqual(sdDecodings[0].decodingMode, "full");
  });

  it("Decodes return values when given superclass", async function () {
    const { WireTest, WireTestParent, WireTestAbstract } = abstractions;
    const deployedContract = await WireTest.deployed();

    let decoder = await Decoder.forContractAt(
      WireTestParent,
      deployedContract.address,
      { projectInfo: { artifacts: Contracts } }
    );

    let abiEntry = WireTestParent.abi.find(
      ({ type, name }) => type === "function" && name === "inheritedReturn"
    );
    let selector = web3.eth.abi.encodeFunctionSignature(abiEntry);

    //we need the raw return data, and contract.call() does not exist yet,
    //so we're going to have to use web3.eth.call()

    let data = await web3.eth.call({
      to: deployedContract.address,
      data: selector
    });

    let decodings = await decoder.decodeReturnValue(abiEntry, data);
    assert.lengthOf(decodings, 1);
    let decoding = decodings[0];
    assert.strictEqual(decoding.kind, "return");
    assert.strictEqual(decoding.decodingMode, "full");
    assert.lengthOf(decoding.arguments, 1);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decoding.arguments[0].value),
      1
    );

    //now again, but with an abstract contract
    decoder = await Decoder.forContractAt(
      WireTestAbstract,
      deployedContract.address,
      { projectInfo: { artifacts: Contracts } }
    );

    abiEntry = WireTestAbstract.abi.find(
      ({ type, name }) => type === "function" && name === "overriddenReturn"
    );
    selector = web3.eth.abi.encodeFunctionSignature(abiEntry);

    //we need the raw return data, and contract.call() does not exist yet,
    //so we're going to have to use web3.eth.call()

    data = await web3.eth.call({
      to: deployedContract.address,
      data: selector
    });

    decodings = await decoder.decodeReturnValue(abiEntry, data);
    assert.lengthOf(decodings, 1);
    decoding = decodings[0];
    assert.strictEqual(decoding.kind, "return");
    assert.strictEqual(decoding.decodingMode, "full");
    assert.lengthOf(decoding.arguments, 1);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decoding.arguments[0].value),
      2
    );
  });

  describe("Custom error decoding", function () {
    it("Decodes unambiguous custom errors", async function () {
      const { WireTest } = abstractions;
      const deployedContract = await WireTest.deployed();
  
      const decoder = await Decoder.forContract(WireTest, {
        projectInfo: { artifacts: Contracts }
      });
  
      let abiEntry = WireTest.abi.find(
        ({ type, name }) => type === "function" && name === "throwUnambiguous"
      );
      let selector = web3.eth.abi.encodeFunctionSignature(abiEntry);
  
      //we need the raw return data, and contract.call() does not exist yet,
      //so we're going to have to use web3.eth.call()
  
      let data = await web3.eth.call({
        to: deployedContract.address,
        data: selector
      });

      debug("data: %O", data);
  
      let decodings = await decoder.decodeReturnValue(abiEntry, data);
      assert.lengthOf(decodings, 1);
      let decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "UnambiguousError");
      assert.strictEqual(decoding.definedIn.typeName, "WireTest");
      assert.lengthOf(decoding.arguments, 2);
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(decoding.arguments[0].value),
        -1
      );
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(decoding.arguments[1].value),
        -2
      );
    });

    it("Decodes unambiguous custom errors from external calls", async function () {
      const { WireTest } = abstractions;
      const deployedContract = await WireTest.deployed();
  
      const decoder = await Decoder.forContract(WireTest, {
        projectInfo: { artifacts: Contracts }
      });
  
      let abiEntry = WireTest.abi.find(
        ({ type, name }) => type === "function" && name === "callAndThrow"
      );
      let selector = web3.eth.abi.encodeFunctionSignature(abiEntry);
  
      //we need the raw return data, and contract.call() does not exist yet,
      //so we're going to have to use web3.eth.call()
  
      let data = await web3.eth.call({
        to: deployedContract.address,
        data: selector
      });
  
      let decodings = await decoder.decodeReturnValue(abiEntry, data);
      assert.lengthOf(decodings, 1);
      let decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "LibraryError");
      assert.strictEqual(decoding.definedIn.typeName, "WireTestLibrary");
      assert.lengthOf(decoding.arguments, 0);
    });

    it("Decodes ambiguous custom errors", async function () {
      const { WireTest } = abstractions;
      const deployedContract = await WireTest.deployed();
  
      const decoder = await Decoder.forContract(WireTest, {
        projectInfo: { artifacts: Contracts }
      });
  
      let abiEntry = WireTest.abi.find(
        ({ type, name }) => type === "function" && name === "throwAmbiguous"
      );
      let selector = web3.eth.abi.encodeFunctionSignature(abiEntry);
  
      //we need the raw return data, and contract.call() does not exist yet,
      //so we're going to have to use web3.eth.call()
  
      let data = await web3.eth.call({
        to: deployedContract.address,
        data: selector
      });
  
      let decodings = await decoder.decodeReturnValue(abiEntry, data);
      assert.lengthOf(decodings, 2);
      assert.strictEqual(decodings[0].kind, "revert");
      assert.strictEqual(decodings[0].decodingMode, "full");
      assert.strictEqual(decodings[0].abi.name, "h9316");
      assert.strictEqual(decodings[0].definedIn.typeName, "WireTest");
      assert.lengthOf(decodings[0].arguments, 1);
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(decodings[0].arguments[0].value),
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      assert.strictEqual(decodings[1].kind, "revert");
      assert.strictEqual(decodings[1].decodingMode, "full");
      assert.strictEqual(decodings[1].abi.name, "b27072");
      assert.strictEqual(decodings[1].definedIn.typeName, "WireTestLibrary");
      assert.lengthOf(decodings[1].arguments, 1);
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(decodings[1].arguments[0].value),
        0
      );
    });

    it("Decodes ambiguous custom errors from external calls", async function () {
      const { WireTest } = abstractions;
      const deployedContract = await WireTest.deployed();
  
      const decoder = await Decoder.forContract(WireTest, {
        projectInfo: { artifacts: Contracts }
      });
  
      let abiEntry = WireTest.abi.find(
        ({ type, name }) => type === "function" && name === "callAndThrowAmbiguous"
      );
      let selector = web3.eth.abi.encodeFunctionSignature(abiEntry);
  
      //we need the raw return data, and contract.call() does not exist yet,
      //so we're going to have to use web3.eth.call()
  
      let data = await web3.eth.call({
        to: deployedContract.address,
        data: selector
      });
  
      let decodings = await decoder.decodeReturnValue(abiEntry, data);
      assert.lengthOf(decodings, 2);
      //note: what follows is copypasted from above
      assert.strictEqual(decodings[0].kind, "revert");
      assert.strictEqual(decodings[0].decodingMode, "full");
      assert.strictEqual(decodings[0].abi.name, "h9316");
      assert.strictEqual(decodings[0].definedIn.typeName, "WireTest");
      assert.lengthOf(decodings[0].arguments, 1);
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(decodings[0].arguments[0].value),
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      assert.strictEqual(decodings[1].kind, "revert");
      assert.strictEqual(decodings[1].decodingMode, "full");
      assert.strictEqual(decodings[1].abi.name, "b27072");
      assert.strictEqual(decodings[1].definedIn.typeName, "WireTestLibrary");
      assert.lengthOf(decodings[1].arguments, 1);
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(decodings[1].arguments[0].value),
        0
      );
    });
  });
});

function testNoneWithoutExtras(decodings) {
  //no normal decodings, no extras, so should be empty
  assert.lengthOf(decodings, 0);
}

function testNoneWithExtras(decodings) {
  //just the extra decoding
  assert.lengthOf(decodings, 1);
  const decoding = decodings[0];
  assert.strictEqual(decoding.kind, "event");
  assert.strictEqual(decoding.class.typeName, "WireTestRedHerring");
  assert.strictEqual(decoding.definedIn.typeName, "WireTestRedHerring");
  assert.strictEqual(decoding.abi.name, "NonAmbiguousEvent");
  assert.strictEqual(decoding.decodingMode, "full");
  assert.lengthOf(decoding.arguments, 0);
}

function testSomeWithoutExtras(decodings) {
  //just the normal decoding
  assert.lengthOf(decodings, 1);
  const decoding = decodings[0];
  assert.strictEqual(decoding.kind, "event");
  assert.strictEqual(decoding.class.typeName, "WireTest");
  assert.strictEqual(decoding.definedIn.typeName, "WireTest");
  assert.strictEqual(decoding.abi.name, "SemiAmbiguousEvent");
  assert.strictEqual(decoding.decodingMode, "full");
  assert.deepEqual(
    decoding.arguments.map(({ value }) =>
      Codec.Format.Utils.Inspect.unsafeNativize(value)
    ),
    [1, 2]
  );
}

function testSomeWithExtras(decodings) {
  //just the normal decoding and extras
  assert.lengthOf(decodings, 2);
  const decoding = decodings[0];
  assert.strictEqual(decoding.kind, "event");
  assert.strictEqual(decoding.class.typeName, "WireTest");
  assert.strictEqual(decoding.definedIn.typeName, "WireTest");
  assert.strictEqual(decoding.abi.name, "SemiAmbiguousEvent");
  assert.strictEqual(decoding.decodingMode, "full");
  assert.deepEqual(
    decoding.arguments.map(({ value }) =>
      Codec.Format.Utils.Inspect.unsafeNativize(value)
    ),
    [1, 2]
  );
  const extraDecoding = decodings[1];
  assert.strictEqual(extraDecoding.kind, "event");
  assert.strictEqual(extraDecoding.class.typeName, "WireTestRedHerring");
  assert.strictEqual(extraDecoding.definedIn.typeName, "WireTestRedHerring");
  assert.strictEqual(extraDecoding.abi.name, "SemiAmbiguousEvent");
  assert.strictEqual(extraDecoding.decodingMode, "full");
  assert.deepEqual(
    extraDecoding.arguments.map(({ value }) =>
      Codec.Format.Utils.Inspect.unsafeNativize(value)
    ),
    [2, 1]
  );
}
