const debug = require("debug")("decoder:test:wire-test");
const assert = require("chai").assert;

const TruffleDecoder = require("../../../truffle-decoder");

const WireTest = artifacts.require("WireTest");
const WireTestParent = artifacts.require("WireTestParent");

contract("WireTest", _accounts => {
  it("should correctly decode transactions and events", async () => {
    let deployedContract = await WireTest.new(true, "0xdeadbeef", 2);
    let address = deployedContract.address;
    let constructorHash = deployedContract.transactionHash;

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
    debug("inherited: %O", inherited);
    let inheritedHash = inherited.tx;

    let indexTestArgs = [7, 89, "hello", "indecipherable", 62];
    let indexTest = await deployedContract.indexTest(...indexTestArgs);

    let constructorTx = await web3.eth.getTransaction(constructorHash);
    let emitStuffTx = await web3.eth.getTransaction(emitStuffHash);
    let moreStuffTx = await web3.eth.getTransaction(moreStuffHash);
    let inheritedTx = await web3.eth.getTransaction(inheritedHash);
    let defaultConstructorTx = await web3.eth.getTransaction(
      defaultConstructorHash
    );

    const decoder = TruffleDecoder.forProject(
      [WireTest, WireTestParent],
      web3.currentProvider
    );
    await decoder.init();

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
  });
});
