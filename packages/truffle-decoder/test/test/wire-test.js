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
    assert.strictEqual(constructorDecoding.arguments.length, 3);
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
    assert.strictEqual(emitStuffDecoding.arguments.length, 3);
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
    assert.strictEqual(moreStuffDecoding.arguments.length, 2);
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
    assert.strictEqual(inheritedDecoding.arguments.length, 1);
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
    assert.strictEqual(defaultConstructorDecoding.arguments.length, 0);
  });
});
