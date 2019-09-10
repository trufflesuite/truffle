const debug = require("debug")("decoder:test:downgrade-test");
const assert = require("chai").assert;
const Big = require("big.js");
const clonedeep = require("lodash.clonedeep");

const TruffleDecoder = require("../../../truffle-decoder");
const TruffleCodec = require("../../../truffle-codec");
const ConversionUtils = require("../../../truffle-codec-utils").Conversion;

const DowngradeTestUnmodified = artifacts.require("DowngradeTest");

//verify the decoding for run
function verifyAbiDecoding(decoding, address) {
  assert.strictEqual(decoding.decodingMode, "abi");
  //we'll skip verifying the kind and name for once
  assert.lengthOf(decoding.arguments, 4);
  //we'll skip verifying the names as well

  //first argument: {x: 7, y: 5}
  assert.strictEqual(decoding.arguments[0].value.type.typeClass, "tuple");
  assert.deepEqual(ConversionUtils.nativize(decoding.arguments[0].value), [
    7,
    5
  ]);
  //second argument: No (i.e. 1)
  assert.strictEqual(decoding.arguments[1].value.type.typeClass, "uint");
  assert.strictEqual(decoding.arguments[1].value.type.bits, 8);
  assert.deepEqual(ConversionUtils.nativize(decoding.arguments[1].value), 1);
  //third argument: the contract (i.e. its address)
  assert.strictEqual(decoding.arguments[2].value.type.typeClass, "address");
  assert.strictEqual(decoding.arguments[2].value.type.payable, false);
  assert.deepEqual(
    ConversionUtils.nativize(decoding.arguments[2].value),
    address
  );
  //fourth argument: the same thing
  assert.strictEqual(decoding.arguments[3].value.type.typeClass, "address");
  assert.strictEqual(decoding.arguments[3].value.type.payable, false);
  assert.deepEqual(
    ConversionUtils.nativize(decoding.arguments[3].value),
    address
  );
}

function verifyAbiFunctionDecoding(decoding, address) {
  assert.strictEqual(decoding.decodingMode, "abi");
  assert.strictEqual(decoding.kind, "event");
  assert.strictEqual(decoding.abi.name, "CauseTrouble");
  assert.lengthOf(decoding.arguments, 1);
  assert.isUndefined(decoding.arguments[0].name);
  assert.strictEqual(decoding.arguments[0].value.type.typeClass, "function");
  assert.strictEqual(decoding.arguments[0].value.type.visibility, "external");
  assert.strictEqual(decoding.arguments[0].value.type.kind, "general");
  assert.strictEqual(decoding.arguments[0].value.kind, "value");
  //NOTE: we only messed with the node, not the bytecode, so, even abified,
  //external function decoding should still work properly!
  assert.strictEqual(decoding.arguments[0].value.value.kind, "known");
  assert.strictEqual(decoding.arguments[0].value.value.contract.kind, "known");
  assert.strictEqual(
    decoding.arguments[0].value.value.contract.class.typeName,
    "DowngradeTest"
  );
  assert.strictEqual(
    decoding.arguments[0].value.value.contract.address,
    address
  );
  let selector = web3.eth.abi.encodeFunctionSignature("causeTrouble()");
  assert.strictEqual(decoding.arguments[0].value.value.selector, selector);
}

async function runTestBody(DowngradeTest, fullMode = false) {
  let decoder = await TruffleDecoder.forProject(
    [DowngradeTest._json],
    web3.currentProvider
  );
  let deployedContract = await DowngradeTest.new();
  let address = deployedContract.address;

  let result = await deployedContract.run([7, 5], 1, address, address);
  let resultHash = result.tx;
  let resultTx = await web3.eth.getTransaction(resultHash);
  let resultLog = result.receipt.rawLogs[0];

  let txDecoding = (await decoder.decodeTransaction(resultTx)).decoding;
  let logDecodings = (await decoder.decodeLog(resultLog)).decodings;

  if (fullMode) {
    assert.strictEqual(txDecoding.decodingMode, "full");
    txDecoding = TruffleCodec.abifyCalldataDecoding(txDecoding);
  }
  verifyAbiDecoding(txDecoding, address);

  assert.lengthOf(logDecodings, 1);
  let logDecoding = logDecodings[0];
  if (fullMode) {
    assert.strictEqual(logDecoding.decodingMode, "full");
    logDecoding = TruffleCodec.abifyLogDecoding(logDecoding);
  }
  verifyAbiDecoding(logDecoding, address);

  //huh -- I thought I'd eliminated that exception, but I'm
  //still getting it.  weird.  well, whatever...
  try {
    await deployedContract.causeTrouble();
  } catch (_) {
    //do nothing, get the result a different way
  }
  //HACK
  let fnEvents = await decoder.events();
  assert.lengthOf(fnEvents, 1);
  debug("the function log: %O", fnEvents[0]);
  let fnDecodings = fnEvents[0].decodings;
  assert.lengthOf(fnDecodings, 1);
  let fnDecoding = fnDecodings[0];
  if (fullMode) {
    assert.strictEqual(fnDecoding.decodingMode, "full");
    fnDecoding = TruffleCodec.abifyLogDecoding(fnDecoding);
  }
  verifyAbiFunctionDecoding(fnDecoding, address);
}

contract("DowngradeTest", _accounts => {
  it("Correctly degrades on allocation when no node", async () => {
    let DowngradeTest = clonedeep(DowngradeTestUnmodified);
    DowngradeTest._json.ast = undefined;

    await runTestBody(DowngradeTest);
  });

  it("Correctly degrades on allocation when error", async () => {
    //HACK
    DowngradeTest = clonedeep(DowngradeTestUnmodified);

    let contractNode = DowngradeTest._json.ast.nodes.find(
      node =>
        node.nodeType === "ContractDefinition" && node.name === "DowngradeTest"
    );

    let structNode = contractNode.nodes.find(
      node => node.nodeType === "StructDefinition" && node.name === "Pair"
    );

    structNode.nodeType = "Ninja"; //fake node type which will prevent
    //the decoder from recognizing it as a struct definition

    await runTestBody(DowngradeTest);
  });

  it("Correctly degrades on decoding when error", async () => {
    //HACK
    let DowngradeTest = clonedeep(DowngradeTestUnmodified);

    let contractNode = DowngradeTest._json.ast.nodes.find(
      node =>
        node.nodeType === "ContractDefinition" && node.name === "DowngradeTest"
    );

    let enumNode = contractNode.nodes.find(
      node => node.nodeType === "EnumDefinition" && node.name === "Ternary"
    );

    enumNode.nodeType = "Ninja"; //fake node type which will prevent
    //the decoder from recognizing it as a enum definition

    await runTestBody(DowngradeTest);
  });

  it("Correctly abifies after finishing", async () => {
    let DowngradeTest = DowngradeTestUnmodified; //for once, we're not modifiying it!

    await runTestBody(DowngradeTest, true);
  });

  it("Correctly decodes decimals", async () => {
    //HACK
    let DowngradeTest = clonedeep(DowngradeTestUnmodified);

    const tau = new Big("6.2831853072");
    const taue10 = 62831853072;

    //now, we're going to send this transaction with the unmodified ABI,
    //because ethers encoder can't yet handle fixed-point

    let deployedContract = await DowngradeTest.new();
    let decimalResult = await deployedContract.shhImADecimal(taue10);
    let decimalHash = decimalResult.tx;
    let decimalTx = await web3.eth.getTransaction(decimalHash);
    let decimalLog = decimalResult.receipt.rawLogs[0];

    //...and now let's just go back and tweak that ABI a little before setting
    //up the decoder...
    DowngradeTest._json.abi.find(
      abiEntry => abiEntry.name === "shhImADecimal"
    ).inputs[0].type = "fixed168x10";
    DowngradeTest._json.abi.find(
      abiEntry => abiEntry.name === "SecretlyADecimal"
    ).inputs[0].type = "fixed168x10";

    //...and now let's set up a decoder for our hacked-up contract artifact.
    let decoder = await TruffleDecoder.forProject(
      [DowngradeTest._json],
      web3.currentProvider
    );

    //now, let's do the decoding
    let txDecoding = (await decoder.decodeTransaction(decimalTx)).decoding;
    let logDecodings = (await decoder.decodeLog(decimalLog)).decodings;

    //now let's check the results!
    assert.strictEqual(txDecoding.decodingMode, "abi");
    assert.strictEqual(txDecoding.kind, "function");
    assert.strictEqual(txDecoding.abi.name, "shhImADecimal");
    assert.lengthOf(txDecoding.arguments, 1);
    assert.strictEqual(txDecoding.arguments[0].name, "secretlyADecimal");
    assert.strictEqual(txDecoding.arguments[0].value.type.typeClass, "fixed");
    assert.strictEqual(txDecoding.arguments[0].value.type.bits, 168);
    assert.strictEqual(txDecoding.arguments[0].value.type.places, 10);
    assert.strictEqual(txDecoding.arguments[0].value.type.places, 10);
    assert.strictEqual(txDecoding.arguments[0].value.kind, "value");
    assert(txDecoding.arguments[0].value.value.asBig.eq(tau));

    //event decoding
    assert.lengthOf(logDecodings, 1);
    let logDecoding = logDecodings[0];
    assert.strictEqual(logDecoding.decodingMode, "abi");
    assert.strictEqual(logDecoding.kind, "event");
    assert.strictEqual(logDecoding.abi.name, "SecretlyADecimal");
    assert.lengthOf(logDecoding.arguments, 1);
    assert.isUndefined(logDecoding.arguments[0].name);
    assert.strictEqual(logDecoding.arguments[0].value.type.typeClass, "fixed");
    assert.strictEqual(logDecoding.arguments[0].value.type.bits, 168);
    assert.strictEqual(logDecoding.arguments[0].value.type.places, 10);
    assert.strictEqual(logDecoding.arguments[0].value.type.places, 10);
    assert.strictEqual(logDecoding.arguments[0].value.kind, "value");
    assert(logDecoding.arguments[0].value.value.asBig.eq(tau));
  });
});
