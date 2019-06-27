const debug = require("debug")("decoder:test:wire-test");
const assert = require("chai").assert;

const TruffleDecoder = require("../../../truffle-decoder");

const WireTest = artifacts.require("WireTest");
const WireTestParent = artifacts.require("WireTestParent");
const WireTestLibrary = artifacts.require("WireTestLibrary");

contract("WireTest", _accounts => {
  it("should correctly decode transactions and events", async () => {
    let deployedContract = await WireTest.new(true, "0xdeadbeef", 2);
    let address = deployedContract.address;
    let constructorHash = deployedContract.transactionHash;

    const decoder = TruffleDecoder.forProject(
      [WireTest, WireTestParent, WireTestLibrary],
      web3.currentProvider
    );
    await decoder.init();

    let deployedContractNoConstructor = await WireTestParent.new();
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
      ["hello", "hi", "hooblypoob"]
    ];

    let emitStuff = await deployedContract.emitStuff(...emitStuffArgs);
    let emitStuffHash = emitStuff.tx;

    let moreStuffArgs = [address, [8, 8, 8, 7, 8, 8, 8]];

    let moreStuff = await deployedContract.moreStuff(...moreStuffArgs);
    let moreStuffHash = moreStuff.tx;

    let inheritedArg = [2, 3];
    let inherited = await deployedContract.inherited(inheritedArg);
    let inheritedHash = inherited.tx;

    let indexTestArgs = [7, 89, "hello", "indecipherable", 62];
    let indexTest = await deployedContract.indexTest(...indexTestArgs);

    let libraryTestArg = "zooglyzooglyzooglyzoogly";
    let libraryTest = await deployedContract.libraryTest(libraryTestArg);

    let constructorTx = await web3.eth.getTransaction(constructorHash);
    let emitStuffTx = await web3.eth.getTransaction(emitStuffHash);
    let moreStuffTx = await web3.eth.getTransaction(moreStuffHash);
    let inheritedTx = await web3.eth.getTransaction(inheritedHash);
    let defaultConstructorTx = await web3.eth.getTransaction(
      defaultConstructorHash
    );

    let constructorDecoding = (await decoder.decodeTransaction(constructorTx))
      .decoding;
    let emitStuffDecoding = (await decoder.decodeTransaction(emitStuffTx))
      .decoding;
    let moreStuffDecoding = (await decoder.decodeTransaction(moreStuffTx))
      .decoding;
    let inheritedDecoding = (await decoder.decodeTransaction(inheritedTx))
      .decoding;
    let defaultConstructorDecoding = (await decoder.decodeTransaction(
      defaultConstructorTx
    )).decoding;

    assert.strictEqual(constructorDecoding.kind, "constructor");
    assert.strictEqual(constructorDecoding.class.typeName, "WireTest");
    assert.lengthOf(constructorDecoding.arguments, 3);
    assert.strictEqual(constructorDecoding.arguments[0].name, "status");
    assert.strictEqual(constructorDecoding.arguments[0].value.nativize(), true);
    assert.strictEqual(constructorDecoding.arguments[1].name, "info");
    assert.strictEqual(
      constructorDecoding.arguments[1].value.nativize(),
      "0xdeadbeef"
    );
    assert.strictEqual(constructorDecoding.arguments[2].name, "whoknows");
    assert.strictEqual(
      constructorDecoding.arguments[2].value.nativize(),
      "WireTest.Ternary.MaybeSo"
    );

    assert.strictEqual(emitStuffDecoding.kind, "function");
    assert.strictEqual(emitStuffDecoding.name, "emitStuff");
    assert.strictEqual(emitStuffDecoding.class.typeName, "WireTest");
    assert.lengthOf(emitStuffDecoding.arguments, 3);
    assert.strictEqual(emitStuffDecoding.arguments[0].name, "p");
    assert.deepEqual(
      emitStuffDecoding.arguments[0].value.nativize(),
      emitStuffArgs[0]
    );
    assert.strictEqual(emitStuffDecoding.arguments[1].name, "precompiles");
    assert.deepEqual(
      emitStuffDecoding.arguments[1].value.nativize(),
      emitStuffArgs[1]
    );
    assert.strictEqual(emitStuffDecoding.arguments[2].name, "strings");
    assert.deepEqual(
      emitStuffDecoding.arguments[2].value.nativize(),
      emitStuffArgs[2]
    );

    assert.strictEqual(moreStuffDecoding.kind, "function");
    assert.strictEqual(moreStuffDecoding.name, "moreStuff");
    assert.strictEqual(moreStuffDecoding.class.typeName, "WireTest");
    assert.lengthOf(moreStuffDecoding.arguments, 2);
    assert.strictEqual(moreStuffDecoding.arguments[0].name, "notThis");
    assert.strictEqual(
      moreStuffDecoding.arguments[0].value.nativize(),
      `WireTest(${moreStuffArgs[0]})`
    );
    assert.strictEqual(moreStuffDecoding.arguments[1].name, "bunchOfInts");
    assert.deepEqual(
      moreStuffDecoding.arguments[1].value.nativize(),
      moreStuffArgs[1]
    );

    assert.strictEqual(inheritedDecoding.kind, "function");
    assert.strictEqual(inheritedDecoding.name, "inherited");
    assert.strictEqual(inheritedDecoding.class.typeName, "WireTest"); //NOT WireTestParent
    assert.lengthOf(inheritedDecoding.arguments, 1);
    assert.isUndefined(inheritedDecoding.arguments[0].name);
    assert.deepEqual(
      inheritedDecoding.arguments[0].value.nativize(),
      inheritedArg
    );

    assert.strictEqual(defaultConstructorDecoding.kind, "constructor");
    assert.strictEqual(
      defaultConstructorDecoding.class.typeName,
      "WireTestParent"
    );
    assert.isEmpty(defaultConstructorDecoding.arguments);

    //now for events!
    let constructorBlock = constructorTx.blockNumber;
    let emitStuffBlock = emitStuff.receipt.blockNumber;
    let moreStuffBlock = moreStuff.receipt.blockNumber;
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

    let constructorEvents = await decoder.events(
      null,
      constructorBlock,
      constructorBlock
    );
    let emitStuffEvents = await decoder.events(
      null,
      emitStuffBlock,
      emitStuffBlock
    );
    let moreStuffEvents = await decoder.events(
      null,
      moreStuffBlock,
      moreStuffBlock
    );
    let inheritedEvents = await decoder.events(
      null,
      inheritedBlock,
      inheritedBlock
    );
    let indexTestEvents = await decoder.events(
      null,
      indexTestBlock,
      indexTestBlock
    );
    let libraryTestEvents = await decoder.events(
      null,
      libraryTestBlock,
      libraryTestBlock
    );
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
    assert.strictEqual(constructorEventDecoding.class.typeName, "WireTest");
    assert.strictEqual(constructorEventDecoding.name, "ConstructorEvent");
    assert.lengthOf(constructorEventDecoding.arguments, 3);
    assert.strictEqual(constructorEventDecoding.arguments[0].name, "bit");
    assert.strictEqual(
      constructorEventDecoding.arguments[0].value.nativize(),
      true
    );
    assert.isUndefined(constructorEventDecoding.arguments[1].name);
    assert.strictEqual(
      constructorEventDecoding.arguments[1].value.nativize(),
      "0xdeadbeef"
    );
    assert.isUndefined(constructorEventDecoding.arguments[2].name);
    assert.strictEqual(
      constructorEventDecoding.arguments[2].value.nativize(),
      "WireTest.Ternary.MaybeSo"
    );

    assert.strictEqual(emitStuffEventDecoding.kind, "event");
    assert.strictEqual(emitStuffEventDecoding.name, "EmitStuff");
    assert.strictEqual(emitStuffEventDecoding.class.typeName, "WireTest");
    assert.lengthOf(emitStuffEventDecoding.arguments, 3);
    assert.isUndefined(emitStuffEventDecoding.arguments[0].name);
    assert.deepEqual(
      emitStuffEventDecoding.arguments[0].value.nativize(),
      emitStuffArgs[0]
    );
    assert.isUndefined(emitStuffEventDecoding.arguments[1].name);
    assert.deepEqual(
      emitStuffEventDecoding.arguments[1].value.nativize(),
      emitStuffArgs[1]
    );
    assert.isUndefined(emitStuffEventDecoding.arguments[2].name);
    assert.deepEqual(
      emitStuffEventDecoding.arguments[2].value.nativize(),
      emitStuffArgs[2]
    );

    assert.strictEqual(moreStuffEventDecoding.kind, "event");
    assert.strictEqual(moreStuffEventDecoding.name, "MoreStuff");
    assert.strictEqual(moreStuffEventDecoding.class.typeName, "WireTest");
    assert.lengthOf(moreStuffEventDecoding.arguments, 2);
    assert.isUndefined(moreStuffEventDecoding.arguments[0].name);
    assert.strictEqual(
      moreStuffEventDecoding.arguments[0].value.nativize(),
      `WireTest(${moreStuffArgs[0]})`
    );
    assert.strictEqual(moreStuffEventDecoding.arguments[1].name, "data");
    assert.deepEqual(
      moreStuffEventDecoding.arguments[1].value.nativize(),
      moreStuffArgs[1]
    );

    assert.strictEqual(inheritedEventDecoding.kind, "event");
    assert.strictEqual(inheritedEventDecoding.name, "Done");
    assert.strictEqual(inheritedEventDecoding.class.typeName, "WireTest"); //NOT WireTestParent
    assert.isEmpty(inheritedEventDecoding.arguments);

    assert.strictEqual(indexTestEventDecoding.kind, "event");
    assert.strictEqual(indexTestEventDecoding.name, "HasIndices");
    assert.strictEqual(indexTestEventDecoding.class.typeName, "WireTest");
    assert.lengthOf(indexTestEventDecoding.arguments, 5);
    assert.isUndefined(indexTestEventDecoding.arguments[0].name);
    assert.strictEqual(
      indexTestEventDecoding.arguments[0].value.nativize(),
      indexTestArgs[0]
    );
    assert.isUndefined(indexTestEventDecoding.arguments[1].name);
    assert.deepEqual(
      indexTestEventDecoding.arguments[1].value.nativize(),
      indexTestArgs[1]
    );
    assert.isUndefined(indexTestEventDecoding.arguments[2].name);
    assert.deepEqual(
      indexTestEventDecoding.arguments[2].value.nativize(),
      indexTestArgs[2]
    );
    assert.isUndefined(indexTestEventDecoding.arguments[3].name);
    assert.isUndefined(
      indexTestEventDecoding.arguments[3].value.nativize(), //can't decode indexed reference type!
      indexTestArgs[3]
    );
    assert.isUndefined(indexTestEventDecoding.arguments[4].name);
    assert.deepEqual(
      indexTestEventDecoding.arguments[4].value.nativize(),
      indexTestArgs[4]
    );

    assert.strictEqual(libraryTestEventDecoding.kind, "event");
    assert.strictEqual(libraryTestEventDecoding.name, "LibraryEvent");
    assert.strictEqual(
      libraryTestEventDecoding.class.typeName,
      "WireTestLibrary"
    );
    assert.lengthOf(libraryTestEventDecoding.arguments, 1);
    assert.isUndefined(libraryTestEventDecoding.arguments[0].name);
    assert.strictEqual(
      libraryTestEventDecoding.arguments[0].value.nativize(),
      libraryTestArg
    );

    assert.strictEqual(dangerEventDecoding.kind, "event");
    assert.strictEqual(dangerEventDecoding.name, "Danger");
    assert.lengthOf(dangerEventDecoding.arguments, 1);
    assert.isUndefined(dangerEventDecoding.arguments[0].name);
    assert.strictEqual(
      dangerEventDecoding.arguments[0].value.nativize(),
      `WireTest(${address}).danger`
    );
  });

  it("disambiguates events when possible and not when impossible", async () => {
    let deployedContract = await WireTest.deployed();

    const decoder = TruffleDecoder.forProject(
      [WireTest, WireTestParent, WireTestLibrary],
      web3.currentProvider
    );
    await decoder.init();

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
    assert.strictEqual(ambiguityTestContractDecoding.name, "AmbiguousEvent");
    assert.strictEqual(
      ambiguityTestContractDecoding.class.typeName,
      "WireTest"
    );
    assert.lengthOf(ambiguityTestContractDecoding.arguments, 2);
    assert.isUndefined(
      ambiguityTestContractDecoding.arguments[0].value.nativize()
    );
    assert.deepEqual(
      ambiguityTestContractDecoding.arguments[1].value.nativize(),
      [32, 3, 17, 18, 19]
    );

    assert.strictEqual(ambiguityTestLibraryDecoding.kind, "event");
    assert.strictEqual(ambiguityTestLibraryDecoding.name, "AmbiguousEvent");
    assert.strictEqual(
      ambiguityTestLibraryDecoding.class.typeName,
      "WireTestLibrary"
    );
    assert.lengthOf(ambiguityTestLibraryDecoding.arguments, 2);
    assert.deepEqual(
      ambiguityTestLibraryDecoding.arguments[0].value.nativize(),
      [17, 18, 19]
    );
    assert.isUndefined(
      ambiguityTestLibraryDecoding.arguments[1].value.nativize()
    );

    for (let decoding of unambiguousDecodings) {
      assert.strictEqual(decoding.kind, "event");
      assert.strictEqual(decoding.name, "AmbiguousEvent");
    }

    assert.strictEqual(unambiguousDecodings[0].class.typeName, "WireTest");
    assert.lengthOf(unambiguousDecodings[0].arguments, 2);
    assert.isUndefined(unambiguousDecodings[0].arguments[0].value.nativize());
    assert.deepEqual(unambiguousDecodings[0].arguments[1].value.nativize(), [
      32,
      1e12,
      17,
      18,
      19
    ]);

    assert.strictEqual(unambiguousDecodings[1].class.typeName, "WireTest");
    assert.lengthOf(unambiguousDecodings[1].arguments, 2);
    assert.isUndefined(unambiguousDecodings[1].arguments[0].value.nativize());
    assert.deepEqual(unambiguousDecodings[1].arguments[1].value.nativize(), [
      32,
      3,
      257,
      257,
      257
    ]);

    assert.strictEqual(unambiguousDecodings[2].class.typeName, "WireTest");
    assert.lengthOf(unambiguousDecodings[2].arguments, 2);
    assert.isUndefined(unambiguousDecodings[2].arguments[0].value.nativize());
    assert.deepEqual(unambiguousDecodings[2].arguments[1].value.nativize(), [
      64,
      0,
      2,
      1,
      1
    ]);

    assert.strictEqual(
      unambiguousDecodings[3].class.typeName,
      "WireTestLibrary"
    );
    assert.lengthOf(unambiguousDecodings[3].arguments, 2);
    assert.deepEqual(unambiguousDecodings[3].arguments[0].value.nativize(), [
      107
    ]);
    assert.isUndefined(unambiguousDecodings[3].arguments[1].value.nativize());
  });
});
