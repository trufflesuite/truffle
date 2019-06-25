const assert = require("chai").assert;

const TruffleDecoder = require("../../../truffle-decoder");

const WireTest = artifacts.require("WireTest");

contract("WireTest", _accounts => {
  it("should correctly decode transactions and events", async () => {
    let deployedContract = await WireTest.new(true, "0xdeadbeef", 2);
    let address = deployedContract.address;
    let constructorHash = deployedContract.transactionHash;

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

    let constructorTx = await web3.eth.getTransaction(constructorHash);
    let emitStuffTx = await web3.eth.getTransaction(emitStuffHash);
    let moreStuffTx = await web3.eth.getTransaction(moreStuffHash);

    const decoder = TruffleDecoder.forProject([WireTest], web3.currentProvider);
    await decoder.init();

    let constructorDecoding = (await decoder.decodeTransaction(constructorTx))
      .decoding;
    let emitStuffDecoding = (await decoder.decodeTransaction(emitStuffTx))
      .decoding;
    let moreStuffDecoding = (await decoder.decodeTransaction(moreStuffTx))
      .decoding;

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
    assert.strictEqual(constructorDecoding.arguments[2].value.nativize(), 2);

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
  });
});
