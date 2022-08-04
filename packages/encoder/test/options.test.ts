import debugModule from "debug";
const debug = debugModule("encoder:test");

import { assert } from "chai";
import path from "path";
import fs from "fs-extra";

import * as Encoder from "..";
import * as Codec from "@truffle/codec";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import * as Abi from "@truffle/abi-utils";
import Ganache from "ganache";
import type { Web3BaseProvider as Provider } from "web3-common";

import BN from "bn.js";
import { BigNumber as EthersBigNumber } from "@ethersproject/bignumber";

import { prepareContracts, checkEqTx } from "./helpers";

let artifacts: { [name: string]: Artifact };
let compilations: Codec.Compilations.Compilation[];
const addresses: { [name: string]: string } = {
  "locate.gold": "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
};

beforeAll(async () => {
  //prepare contracts and artifacts

  // need to ts-ignore due to a strict-null-checks issue in Ganache
  // (https://github.com/trufflesuite/ganache/issues/2125)
  // remove this ts-ignore once that issue is fixed
  // @ts-ignore
  const provider: Provider = Ganache.provider({
    seed: "encoder",
    gasLimit: 7000000,
    logging: {
      quiet: true
    },
    miner: {
      //note: we should ideally set strict here, but that causes a test
      //failure in the ENS testing; we should figure out what's up with
      //that so we can set strict
      instamine: "eager"
    }
  });

  const sourceNames = ["EncoderTests.sol", "DecimalTest.vy"];

  let sources: { [name: string]: string } = {};

  for (const name of sourceNames) {
    const sourcePath = path.join(__dirname, name);
    sources[sourcePath] = await fs.readFile(sourcePath, "utf8");
  }

  ({ artifacts, compilations } = await prepareContracts(
    sources,
    addresses,
    provider
  ));
}, 50000);

describe("Encoding", () => {
  describe("Transaction options", () => {
    let encoder: Encoder.ContractEncoder;
    let abi: Abi.FunctionEntry;
    let selector: string;

    beforeAll(async () => {
      encoder = await Encoder.forArtifact(artifacts.TestContract, {
        projectInfo: { compilations }
      });
      abi = <Abi.FunctionEntry>(
        Abi.normalize(artifacts.TestContract.abi).find(
          entry => entry.type === "function" && entry.name === "takesVoid"
        )
      );
      selector = Codec.AbiData.Utils.abiSelector(abi);
    });

    it("Encodes transaction options", async () => {
      const result = await encoder.encodeTxNoResolution(
        abi,
        [
          {
            gas: 1,
            gasPrice: 2,
            value: 3,
            nonce: 4,
            maxFeePerGas: 5, //yes, these options are inconsistent
            maxPriorityFeePerGas: 6, //...very inconsistent
            type: "0x7", //because why not
            from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            to: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            data: "0x0bad",
            overwrite: true,
            privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
            accessList: [
              {
                address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                storageKeys: [
                  "0x0000000000000000000000000000000000000000000000000000000000000008"
                ]
              }
            ]
          }
        ],
        { allowOptions: true }
      );
      const expected = {
        gas: new BN(1),
        gasPrice: new BN(2),
        value: new BN(3),
        nonce: new BN(4),
        maxFeePerGas: new BN(5),
        maxPriorityFeePerGas: new BN(6),
        type: "0x07",
        from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
        to: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
        data: selector, //note input data is ignored!
        overwrite: true,
        privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
        accessList: [
          {
            address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000008"
            ]
          }
        ]
      };
      checkEqTx(result, expected);
    });

    it("Encodes transaction options with extra & missing keys", async () => {
      const result = await encoder.encodeTxNoResolution(
        abi,
        [
          {
            from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
            garbage: "garbage"
          }
        ],
        { allowOptions: true }
      );
      const expected = {
        from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
        data: selector,
        privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
      };
      assert.deepEqual(result, expected); //no BNs here!
    });

    it("Encodes transaction options that look like type/value input", async () => {
      const result = await encoder.encodeTxNoResolution(
        abi,
        [
          {
            type: "0x1",
            value: "1"
          }
        ],
        { allowOptions: true }
      );
      const expected = {
        data: selector,
        type: "0x01",
        value: new BN(1)
      };
      checkEqTx(result, expected);
    });

    it("Encodes transaction options in unusual forms", async () => {
      const result = await encoder.encodeTxNoResolution(
        abi,
        [
          {
            gas: "1e9",
            gasPrice: "2 gwei",
            value: "3 finney",
            nonce: EthersBigNumber.from(4),
            type: new BN(5),
            from: { address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D" },
            to: "0x10CA7E901D10CA7E901D10CA7E901D10CA7E901D",
            data: [255],
            overwrite: new Boolean(false),
            accessList: [
              {
                address: "10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                storageKeys: [new BN(6)]
              }
            ]
          }
        ],
        { allowOptions: true }
      );
      const expected = {
        gas: new BN(1e9),
        gasPrice: new BN(2e9),
        value: new BN(3e15),
        nonce: new BN(4),
        type: "0x05",
        from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
        to: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
        data: selector, //note input data is ignored!
        overwrite: false,
        accessList: [
          {
            address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000006"
            ]
          }
        ]
      };
      checkEqTx(result, expected);
    });

    it("Encodes type/value pair", async () => {
      const result = await encoder.encodeTxNoResolution(
        abi,
        [
          {
            type: "options",
            value: {
              from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
              garbage: "garbage"
            }
          }
        ],
        { allowOptions: true }
      );
      const expected = {
        from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
        data: selector,
        privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
      };
      assert.deepEqual(result, expected); //no BNs here!
    });

    it("Encodes wrapped options", async () => {
      const wrapped = await encoder.wrap(
        { typeClass: "options" },
        {
          from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
        }
      );
      const result = await encoder.encodeTxNoResolution(abi, [wrapped], {
        allowOptions: true
      });
      const expected = {
        from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
        data: selector,
        privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
      };
      assert.deepEqual(result, expected); //no BNs here!
    });

    it("Rejects bad integer option", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              value: "2.5 wei"
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad value option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad type", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              type: "0xcc"
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad type option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad address option", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901d"
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad from option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad bytes option", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              data: "0xgg"
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad data option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad privateFor option (array null)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              privateFor: null
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad privateFor option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad privateFor option (string null)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              privateFor: [null]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad privateFor option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad privateFor option (not base64)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              privateFor: ["This-String-Contains-Bad-Characters-You-See="]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad privateFor option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad privateFor option (too short)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow"]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad privateFor option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad privateFor option (too long)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNowThis"]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad privateFor option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad accessList option (array null)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              accessList: null
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad accessList option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad accessList option (object null)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              accessList: [null]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad accessList option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad accessList option (bad address)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              accessList: [
                {
                  address: "0xNotAnAddress",
                  storageKeys: []
                }
              ]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad accessList option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad accessList option (storageKeys null)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              accessList: [
                {
                  address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                  storageKeys: null
                }
              ]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad accessList option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects bad accessList option (bad storage key)", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              accessList: [
                {
                  address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                  storageKeys: [-1]
                }
              ]
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Encoded bad accessList option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects object with no relevant keys", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              garbage: "garbage"
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Options had no valid options as keys");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects other input (test: undefined)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [undefined], {
          allowOptions: true
        });
        assert.fail("Undefined got encoded as options");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects other input (test: null)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [null], {
          allowOptions: true
        });
        assert.fail("Null got encoded as options");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects type/value pair with wrong tpe", async () => {
      try {
        await encoder.encodeTxNoResolution(
          abi,
          [
            {
              type: "tuple",
              value: {
                from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
                garbage: "garbage"
              }
            }
          ],
          { allowOptions: true }
        );
        assert.fail("Value specified as tuple got encoded as options");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects nested type/value pair", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
          {
            type: "options",
            value: {
              type: "options",
              value: {
                from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
                garbage: "garbage"
              }
            }
          }
        ]);
        assert.fail("Nested type/value pair got encoded");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects wrapped value of wrong type", async () => {
      const wrapped = await encoder.wrap(
        {
          typeClass: "tuple",
          memberTypes: [
            {
              name: "from",
              type: { typeClass: "address", kind: "general" }
            }
          ]
        },
        {
          from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
        }
      );
      try {
        await encoder.encodeTxNoResolution(abi, [wrapped], {
          allowOptions: true
        });
        assert.fail("Value wrapped as tuple got encoded as options");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });
  });
});
