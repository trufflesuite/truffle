const debug = require("debug")("decoder:test:downgrade-test");
const assert = require("chai").assert;
const Big = require("big.js");
const clonedeep = require("lodash.clonedeep");

const Decoder = require("../..");
const Codec = require("../../../codec");

const DowngradeTestUnmodified = artifacts.require("DowngradeTest");
const DecoyLibrary = artifacts.require("DecoyLibrary");

//verify the decoding for run
function verifyAbiDecoding(decoding, address) {
  assert.strictEqual(decoding.decodingMode, "abi");
  //we'll skip verifying the kind and name for once
  assert.lengthOf(decoding.arguments, 4);
  //we'll skip verifying the names as well

  //first argument: {{x: 7, y: 5}, z: 3}
  assert.strictEqual(decoding.arguments[0].value.type.typeClass, "tuple");
  assert.deepEqual(
    Codec.Format.Utils.Inspect.nativize(decoding.arguments[0].value),
    [[7, 5], 3]
  );
  //second argument: No (i.e. 1)
  assert.strictEqual(decoding.arguments[1].value.type.typeClass, "uint");
  assert.strictEqual(decoding.arguments[1].value.type.bits, 8);
  assert.deepEqual(
    Codec.Format.Utils.Inspect.nativize(decoding.arguments[1].value),
    1
  );
  //third argument: the contract (i.e. its address)
  assert.strictEqual(decoding.arguments[2].value.type.typeClass, "address");
  assert.strictEqual(decoding.arguments[2].value.type.kind, "general");
  assert.deepEqual(
    Codec.Format.Utils.Inspect.nativize(decoding.arguments[2].value),
    address
  );
  //fourth argument: the same thing
  assert.strictEqual(decoding.arguments[3].value.type.typeClass, "address");
  assert.strictEqual(decoding.arguments[3].value.type.kind, "general");
  assert.deepEqual(
    Codec.Format.Utils.Inspect.nativize(decoding.arguments[3].value),
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

async function runTestBody(
  DowngradeTest,
  skipFunctionTests = false,
  fullMode = false
) {
  let decoder = await Decoder.forProject(
    web3.currentProvider,
    [DowngradeTest._json, DecoyLibrary] //HACK: because we've clonedeep'd DowngradeTest,
    //we need to pass in its _json rather than it itself (its getters have been stripped off)
  );
  let deployedContract = await DowngradeTest.new();
  let address = deployedContract.address;

  let result = await deployedContract.run([[7, 5], 3], 1, address, address);
  let resultHash = result.tx;
  let resultTx = await web3.eth.getTransaction(resultHash);
  let resultLog = result.receipt.rawLogs[0];

  let txDecoding = await decoder.decodeTransaction(resultTx);
  let logDecodings = await decoder.decodeLog(resultLog);

  if (fullMode) {
    assert.strictEqual(txDecoding.decodingMode, "full");
    txDecoding = decoder.abifyCalldataDecoding(txDecoding);
  }
  verifyAbiDecoding(txDecoding, address);

  assert.lengthOf(logDecodings, 1);
  let logDecoding = logDecodings[0];
  if (fullMode) {
    assert.strictEqual(logDecoding.decodingMode, "full");
    logDecoding = decoder.abifyLogDecoding(logDecoding);
  }
  verifyAbiDecoding(logDecoding, address);

  if (!skipFunctionTests) {
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
    let fnDecodings = fnEvents[0].decodings;
    assert.lengthOf(fnDecodings, 1);
    let fnDecoding = fnDecodings[0];
    if (fullMode) {
      assert.strictEqual(fnDecoding.decodingMode, "full");
      fnDecoding = decoder.abifyLogDecoding(fnDecoding);
    }
    verifyAbiFunctionDecoding(fnDecoding, address);
  }
}

contract("DowngradeTest", function(accounts) {
  it("Correctly degrades on allocation when no node", async function() {
    let DowngradeTest = clonedeep(DowngradeTestUnmodified);
    DowngradeTest._json.ast = undefined;

    await runTestBody(DowngradeTest);
  });

  it("Correctly degrades on allocation when error", async function() {
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

    await runTestBody(DowngradeTest, true);
  });

  it("Correctly degrades on decoding when error", async function() {
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

    await runTestBody(DowngradeTest, true);
  });

  it("Correctly abifies after finishing", async function() {
    let DowngradeTest = DowngradeTestUnmodified; //for once, we're not modifiying it!

    await runTestBody(DowngradeTest, false, true);
  });

  it("Correctly decodes decimals", async function() {
    //HACK
    let DowngradeTest = clonedeep(DowngradeTestUnmodified);

    //Let's tweak that ABI a little before setting up the decoder...
    DowngradeTest._json.abi.find(
      abiEntry => abiEntry.name === "shhImADecimal"
    ).inputs[0].type = "fixed168x10";

    //...and now let's set up a decoder for our hacked-up contract artifact.
    let decoder = await Decoder.forProject(
      web3.currentProvider,
      [DowngradeTest._json, DecoyLibrary] //HACK: see clonedeep note above
    );

    //the ethers encoder can't yet handle fixed-point
    //(and the hack I tried earlier didn't work because it messed up the signatures)
    //so I'm going to use a *different* hack and send this transaction manually!

    const tau = new Big("6.2831853072");
    const wrappedTau = {
      type: {
        typeClass: "fixed",
        bits: 168,
        places: 10
      },
      kind: "value",
      value: {
        asBig: tau
      }
    };
    const encodedTau = Codec.AbiData.Encode.encodeTupleAbi([wrappedTau]);
    const hexTau = Codec.Conversion.toHexString(encodedTau);
    const selector = web3.eth.abi.encodeFunctionSignature(
      "shhImADecimal(fixed168x10)"
    );
    const data = selector + hexTau.slice(2); //(cut off initial 0x)

    let deployedContract = await DowngradeTest.new();
    let address = deployedContract.address;
    let decimalResult = await web3.eth.sendTransaction({
      from: accounts[0],
      to: address,
      data
    });

    debug("decimalResult: %O", decimalResult);
    let decimalHash = decimalResult.transactionHash;
    let decimalTx = await web3.eth.getTransaction(decimalHash);

    //now, let's do the decoding
    let txDecoding = await decoder.decodeTransaction(decimalTx);

    //now let's check the results!
    debug("txDecoding: %O", txDecoding);
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
  });

  describe("Out-of-range enums", function() {
    it("Doesn't include out-of-range enums in full mode", async function() {
      let DowngradeTest = DowngradeTestUnmodified;
      let decoder = await Decoder.forProject(
        web3.currentProvider,
        [DowngradeTest._json, DecoyLibrary] //not strictly necessary here, but see clonedeep comment above
      );
      let deployedContract = await DowngradeTest.new();

      let txArguments = [9, 9, 1, 1]; //note: 1 is in range; 9 is not

      let result = await deployedContract.enumSilliness(...txArguments);
      let nonIndexedLog = result.receipt.rawLogs[0];
      let indexedLog = result.receipt.rawLogs[1];
      //(these are the order they went in)

      let nonIndexedLogDecodings = await decoder.decodeLog(nonIndexedLog);
      let indexedLogDecodings = await decoder.decodeLog(indexedLog);

      assert.lengthOf(nonIndexedLogDecodings, 1); //because we're in full mode, the decoy decoding should be filtered out
      assert.strictEqual(nonIndexedLogDecodings[0].decodingMode, "full");
      assert.lengthOf(indexedLogDecodings, 1); //because we're in full mode, the decoy decoding should be filtered out
      assert.strictEqual(indexedLogDecodings[0].decodingMode, "full");
    });

    it("Abifies correctly when failure occurs in first enum", async function() {
      //HACK
      let DowngradeTest = clonedeep(DowngradeTestUnmodified);

      let contractNode = DowngradeTest._json.ast.nodes.find(
        node =>
          node.nodeType === "ContractDefinition" &&
          node.name === "DowngradeTest"
      );
      let enumNode = contractNode.nodes.find(
        node => node.nodeType === "EnumDefinition" && node.name === "Ternary"
      );
      enumNode.nodeType = "Ninja"; //fake node type which will prevent
      //the decoder from recognizing it as a enum definition

      await runEnumTestBody(DowngradeTest);
    });

    it("Abifies correctly when failure occurs in second enum", async function() {
      //HACK
      let DowngradeTest = clonedeep(DowngradeTestUnmodified);

      let contractNode = DowngradeTest._json.ast.nodes.find(
        node =>
          node.nodeType === "ContractDefinition" &&
          node.name === "DowngradeTest"
      );
      let enumNode = contractNode.nodes.find(
        node =>
          node.nodeType === "EnumDefinition" && node.name === "PositionOnHill"
      );
      enumNode.nodeType = "Ninja"; //fake node type which will prevent
      //the decoder from recognizing it as a enum definition
      await runEnumTestBody(DowngradeTest);
    });
  });

  it("Decodes external functions via additionalContexts", async function() {
    //HACK
    let DowngradeTest = clonedeep(DowngradeTestUnmodified);
    DowngradeTest._json.deployedBytecode = undefined;

    let deployedContract = await DowngradeTest.new();
    let address = deployedContract.address;
    let decoder = await Decoder.forContractInstance(
      deployedContract,
      [DowngradeTest._json, DecoyLibrary] //HACK: because we've clonedeep'd DowngradeTest,
      //we need to pass in its _json rather than it itself (its getters have been stripped off)
    );

    let decodedFunction = await decoder.variable("doYouSeeMe");
    assert.strictEqual(decodedFunction.type.typeClass, "function");
    assert.strictEqual(decodedFunction.type.visibility, "external");
    assert.strictEqual(decodedFunction.type.kind, "specific");
    assert.strictEqual(decodedFunction.type.mutability, "nonpayable");
    assert.isEmpty(decodedFunction.type.inputParameterTypes);
    assert.isEmpty(decodedFunction.type.outputParameterTypes);
    assert.strictEqual(decodedFunction.kind, "value");
    assert.strictEqual(decodedFunction.value.kind, "known");
    assert.strictEqual(decodedFunction.value.contract.kind, "known");
    assert.strictEqual(
      decodedFunction.value.contract.class.typeName,
      "DowngradeTest"
    );
    assert.strictEqual(decodedFunction.value.contract.address, address);
    let selector = web3.eth.abi.encodeFunctionSignature("causeTrouble()");
    assert.strictEqual(decodedFunction.value.selector, selector);
  });
});

async function runEnumTestBody(DowngradeTest) {
  let decoder = await Decoder.forProject(
    web3.currentProvider,
    [DowngradeTest._json, DecoyLibrary] //HACK: see clonedeep comment above
  );
  let deployedContract = await DowngradeTest.new();

  let txArguments = [9, 9, 1, 1]; //note: 1 is in range; 9 is not
  //the decoy reading swaps the first two arguments with the second two
  let swappedTxArguments = [
    txArguments[2],
    txArguments[3],
    txArguments[0],
    txArguments[1]
  ];

  let result = await deployedContract.enumSilliness(...txArguments);
  let nonIndexedLog = result.receipt.rawLogs[0];
  let indexedLog = result.receipt.rawLogs[1];
  //(these are the order they went in)

  let nonIndexedLogDecodings = await decoder.decodeLog(nonIndexedLog);
  let indexedLogDecodings = await decoder.decodeLog(indexedLog);

  assert.lengthOf(nonIndexedLogDecodings, 2); //we're in ABI mode, so should have correct decoding and decoy decoding
  let decoyDecoding1 = nonIndexedLogDecodings[1]; //decoy decoding should be second (library)
  assert.strictEqual(decoyDecoding1.class.typeName, "DecoyLibrary"); //...but let's confirm that.
  assert.strictEqual(decoyDecoding1.abi.name, "EnumSilliness1"); //also let's verify this is the right event
  assert.strictEqual(decoyDecoding1.decodingMode, "abi");
  let nativizedArguments1 = decoyDecoding1.arguments.map(({ value }) =>
    Codec.Format.Utils.Inspect.nativize(value)
  );
  assert.deepStrictEqual(nativizedArguments1, swappedTxArguments);

  assert.lengthOf(indexedLogDecodings, 2); //we're in ABI mode, so should have correct decoding and decoy decoding
  let decoyDecoding2 = indexedLogDecodings[1]; //decoy decoding should be second (library)
  assert.strictEqual(decoyDecoding2.class.typeName, "DecoyLibrary"); //...but let's confirm that.
  assert.strictEqual(decoyDecoding2.abi.name, "EnumSilliness2"); //also let's verify this is the right event
  assert.strictEqual(decoyDecoding2.decodingMode, "abi");
  let nativizedArguments2 = decoyDecoding2.arguments.map(({ value }) =>
    Codec.Format.Utils.Inspect.nativize(value)
  );
  assert.deepStrictEqual(nativizedArguments2, swappedTxArguments);
}
