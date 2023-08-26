const debug = require("debug")("decoder:test:selector-based-test");
const assert = require("chai").assert;
const sinon = require("sinon");
const Ganache = require("ganache");
const path = require("path");
const { Web3 } = require("web3");
const axios = require("axios");

const Decoder = require("../../..");
const Codec = require("@truffle/codec");

const { prepareContracts } = require("../../helpers");

beforeEach(function () {
  sinon
    .stub(axios, "get")
    .withArgs(
      "https://www.4byte.directory/api/v1/signatures/",
      sinon.match({
        params: sinon.match({
          hex_signature: "0x00000000",
          page: 1
        })
      })
    )
    .returns({ status: 200, data: zeroSelectorResults });
  axios.get.callThrough();
});

afterEach(function () {
  //restoring stubs
  axios.get.restore();
});

describe("Selector-based decoding", function () {
  let provider;
  let abstractions;
  let web3;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      miner: { instamine: "strict" },
      seed: "decoder",
      gasLimit: 7000000,
      logging: { quiet: true }
    });
    web3 = new Web3(provider);
  });

  after(async () => {
    provider && (await provider.disconnect());
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    const prepared = await prepareContracts(
      provider,
      path.resolve(__dirname, "..")
    );
    abstractions = prepared.abstractions;
  });

  it("uses selector-based-decoding on known contracts", async function () {
    this.timeout(4000);
    const deployedContract = await abstractions.Sink.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: [abstractions.Sink] },
      selectorDirectory: { enabled: true }
    });

    const truffleReceipt = await deployedContract.sendTransaction({
      //selector: 0
      //first argument: 2^255+1
      //second argument: 1
      data: "0x0000000010000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000001"
    });
    const tx = await web3.eth.getTransaction(truffleReceipt.tx);

    const overallDecoding = await decoder.decodeTransaction(tx);

    assert.equal(overallDecoding.kind, "message");
    const decodings = overallDecoding.interpretations.selectorBasedDecodings;
    assert.isDefined(decodings, "interpretation was not attached");
    assert.lengthOf(decodings, 2);
    let decoding = decodings[0];
    assert.equal(decoding.kind, "function");
    assert.equal(
      Codec.AbiData.Utils.abiSignature(decoding.abi),
      "randallAteMySandwich_dbohban(uint256,address)"
    );
    assert.equal(decoding.decodingMode, "abi");
    decoding = decodings[1];
    assert.equal(decoding.kind, "function");
    assert.equal(
      Codec.AbiData.Utils.abiSignature(decoding.abi),
      "randallAteMySandwich_bixiwot(uint256,uint256)"
    );
    assert.equal(decoding.decodingMode, "abi");
  });

  it("uses selector-based-decoding on unknown contracts", async function () {
    this.timeout(4000);
    const deployedContract = await abstractions.Sink.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: [] }, //no info given!
      selectorDirectory: { enabled: true }
    });

    const truffleReceipt = await deployedContract.sendTransaction({
      //selector: 0
      //first argument: 2^255+1
      //second argument: 1
      data: "0x0000000010000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000001"
    });
    const tx = await web3.eth.getTransaction(truffleReceipt.tx);

    const overallDecoding = await decoder.decodeTransaction(tx);

    assert.equal(overallDecoding.kind, "unknown");
    const decodings = overallDecoding.interpretations.selectorBasedDecodings;
    assert.isDefined(decodings, "interpretation was not attached");
    assert.lengthOf(decodings, 2);
    let decoding = decodings[0];
    assert.equal(decoding.kind, "function");
    assert.equal(
      Codec.AbiData.Utils.abiSignature(decoding.abi),
      "randallAteMySandwich_dbohban(uint256,address)"
    );
    assert.equal(decoding.decodingMode, "abi");
    decoding = decodings[1];
    assert.equal(decoding.kind, "function");
    assert.equal(
      Codec.AbiData.Utils.abiSignature(decoding.abi),
      "randallAteMySandwich_bixiwot(uint256,uint256)"
    );
    assert.equal(decoding.decodingMode, "abi");
  });

  it("excludes selector-based interpretation when no matches", async function () {
    this.timeout(4000);
    const deployedContract = await abstractions.Sink.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: [abstractions.Sink] },
      selectorDirectory: { enabled: true }
    });

    const truffleReceipt = await deployedContract.sendTransaction({
      //selector: 0
      //first word: 256^20
      //second word: 33
      //third word: 0
      data: "0x00000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000210000000000000000000000000000000000000000000000000000000000000000"
    });
    const tx = await web3.eth.getTransaction(truffleReceipt.tx);

    const overallDecoding = await decoder.decodeTransaction(tx);

    assert.equal(overallDecoding.kind, "message");
    assert.notProperty(
      overallDecoding.interpretations,
      "selectorBasedDecodings"
    );
  });

  it("excludes selector-based interpretation when not enabled", async function () {
    this.timeout(4000);
    const deployedContract = await abstractions.Sink.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: [abstractions.Sink] }
    });

    const truffleReceipt = await deployedContract.sendTransaction({
      //selector: 0
      //first argument: 2^255+1
      //second argument: 1
      data: "0x0000000010000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000001"
    });
    const tx = await web3.eth.getTransaction(truffleReceipt.tx);

    const overallDecoding = await decoder.decodeTransaction(tx);

    assert.equal(overallDecoding.kind, "message");
    assert.notProperty(
      overallDecoding.interpretations,
      "selectorBasedDecodings"
    );
  });
});

const zeroSelectorResults = {
  count: 36,
  next: null,
  previous: null,
  results: [
    {
      id: 1056298,
      created_at: "2023-05-10T19:08:23.426890Z",
      text_signature: "wycpnbqcyf()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 1036589,
      created_at: "2023-03-25T07:03:28.040892Z",
      text_signature:
        "randallAteMySandwich(uint256[],address[],uint8,uint256[],bool,bytes32,address,address[])",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 951166,
      created_at: "2023-03-05T23:22:45.375981Z",
      text_signature: "QKJ0gRzrmgZzBLWm(address,uint256,uint256,bytes)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 911332,
      created_at: "2023-02-01T15:09:28.195737Z",
      text_signature: "MonkahmmXXXXXXXXXXXXACSKFIOY()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 849939,
      created_at: "2023-01-29T17:26:07.960435Z",
      text_signature:
        "fulfillBasicOrder_efficient_fGEoT((((uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint256,uint256,uint256,address,uint8),(bytes32,bytes32,uint8)))",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 849694,
      created_at: "2023-01-26T22:58:56.766599Z",
      text_signature:
        "fulfillBasicOrder_efficient_6GL6yc((address,uint256,uint256,address,address,address,uint256,uint256,uint8,uint256,uint256,bytes32,uint256,bytes32,bytes32,uint256,(uint256,address)[],bytes))",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 847043,
      created_at: "2022-11-13T20:42:52.822214Z",
      text_signature: "randallsRevenge_ilxaotc()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 845490,
      created_at: "2022-09-29T13:12:24.964508Z",
      text_signature:
        "contrivedNameThatisVeryUnlikelyToBeFoundInTheWild_visd4o(address,uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 843197,
      created_at: "2022-07-15T00:33:17.701162Z",
      text_signature: "arb_ybtltp(uint256[])",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 842144,
      created_at: "2022-06-21T09:18:58.279122Z",
      text_signature: "execute_44g58pv()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 841673,
      created_at: "2022-06-16T23:15:56.944101Z",
      text_signature: "f00000000_bvvvdlt()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 834833,
      created_at: "2022-05-04T04:57:38.149119Z",
      text_signature: "mint_efficient_1268F998()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 708136,
      created_at: "2022-04-26T05:15:36.528304Z",
      text_signature: "mint_d22vi9okr4w(address)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 574181,
      created_at: "2022-04-21T03:39:41.906704Z",
      text_signature: "f7836435186477227(address)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 569126,
      created_at: "2022-04-21T02:44:40.330091Z",
      text_signature: "jIUTh(bytes)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 569106,
      created_at: "2022-04-21T02:21:20.584057Z",
      text_signature:
        "AaANwg8((address,address,address,uint136,uint40,uint40,uint24,uint8,uint256,bytes32,bytes32,uint256))",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 445887,
      created_at: "2021-12-09T06:20:59.395454Z",
      text_signature: "f09140466846285922(address,bytes)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 236056,
      created_at: "2021-09-22T13:35:59.354885Z",
      text_signature: "ROOT4146650865()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 233686,
      created_at: "2021-07-31T18:21:35.717396Z",
      text_signature: "bdspwouamqsxyabc(uint256,bytes)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 233606,
      created_at: "2021-07-30T04:53:07.171127Z",
      text_signature: "randallAteMySandwich_atrxxnf(bytes)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 197201,
      created_at: "2021-07-24T03:53:17.360183Z",
      text_signature: "mev_abcd1g3ekj2f4ih5(bytes)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 197200,
      created_at: "2021-07-24T03:48:23.350500Z",
      text_signature: "abcei51243fdgjkh(bytes)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 197199,
      created_at: "2021-07-24T03:20:08.866418Z",
      text_signature: "cehbdjakgfi(address,address,uint256,uint8)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 197126,
      created_at: "2021-07-22T01:17:42.281634Z",
      text_signature: "randallAteMySandwich_dbohban(uint256,address)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 197125,
      created_at: "2021-07-22T01:08:18.060837Z",
      text_signature: "randallAteMySandwich_bixiwot(uint256,uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 197124,
      created_at: "2021-07-22T00:33:15.995821Z",
      text_signature: "randall_was_here_eionbta(uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 188087,
      created_at: "2021-05-28T13:40:31.281154Z",
      text_signature: "buy_bca86a0f(address,uint256,int256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 175574,
      created_at: "2021-02-23T10:26:30.674037Z",
      text_signature: "test2001551086()",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 174836,
      created_at: "2021-01-17T06:21:27.715566Z",
      text_signature: "buyAndFree22457070633(uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 31771,
      created_at: "2018-05-10T11:32:26.666918Z",
      text_signature: "blockHashAskewLimitary(uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 31770,
      created_at: "2018-05-10T11:32:16.370946Z",
      text_signature: "blockHashAmphithyronVersify(uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 31769,
      created_at: "2018-05-10T11:32:05.935426Z",
      text_signature: "blockHashAmarilloNonspontaneously(uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 31768,
      created_at: "2018-05-10T11:31:54.447181Z",
      text_signature: "blockHashAddendsInexpansible(uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 31623,
      created_at: "2018-04-28T18:00:27.736494Z",
      text_signature: "left_branch_block(uint32)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 31614,
      created_at: "2018-04-28T06:59:29.086101Z",
      text_signature:
        "overdiffusingness(bytes,uint256,uint256,uint256,uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    },
    {
      id: 31613,
      created_at: "2018-04-28T03:59:19.032719Z",
      text_signature: "get_block_hash_257335279069929(uint256)",
      hex_signature: "0x00000000",
      bytes_signature: "\x00\x00\x00\x00"
    }
  ]
};
