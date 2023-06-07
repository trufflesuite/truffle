import type { ConstructorDecoding } from "@truffle/codec";
import BN from "bn.js";

export default {
  zeroParam: {
    abi: { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    arguments: [],
    bytecode:
      "0x60806040526040518060400160405280600381526020017f62617200000000000000000000000000000000000000000000000000000000008152506000908161004891906102ab565b5034801561005557600080fd5b5061037d565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806100dc57607f821691505b6020821081036100ef576100ee610095565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026101577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8261011a565b610161868361011a565b95508019841693508086168417925050509392505050565b6000819050919050565b6000819050919050565b60006101a86101a361019e84610179565b610183565b610179565b9050919050565b6000819050919050565b6101c28361018d565b6101d66101ce826101af565b848454610127565b825550505050565b600090565b6101eb6101de565b6101f68184846101b9565b505050565b5b8181101561021a5761020f6000826101e3565b6001810190506101fc565b5050565b601f82111561025f57610230816100f5565b6102398461010a565b81016020851015610248578190505b61025c6102548561010a565b8301826101fb565b50505b505050565b600082821c905092915050565b600061028260001984600802610264565b1980831691505092915050565b600061029b8383610271565b9150826002028217905092915050565b6102b48261005b565b67ffffffffffffffff8111156102cd576102cc610066565b5b6102d782546100c4565b6102e282828561021e565b600060209050601f8311600181146103155760008415610303578287015190505b61030d858261028f565b865550610375565b601f198416610323866100f5565b60005b8281101561034b57848901518255600182019150602085019450602081019050610326565b868310156103685784890151610364601f891682610271565b8355505b6001600288020188555050505b505050505050565b61023b8061038c6000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80630dbe671f1461003b578063c298557814610045575b600080fd5b610043610063565b005b61004d610065565b60405161005a9190610183565b60405180910390f35b565b60008054610072906101d4565b80601f016020809104026020016040519081016040528092919081815260200182805461009e906101d4565b80156100eb5780601f106100c0576101008083540402835291602001916100eb565b820191906000526020600020905b8154815290600101906020018083116100ce57829003601f168201915b505050505081565b600081519050919050565b600082825260208201905092915050565b60005b8381101561012d578082015181840152602081019050610112565b60008484015250505050565b6000601f19601f8301169050919050565b6000610155826100f3565b61015f81856100fe565b935061016f81856020860161010f565b61017881610139565b840191505092915050565b6000602082019050818103600083015261019d818461014a565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806101ec57607f821691505b6020821081036101ff576101fe6101a5565b5b5091905056fea26469706673582212200153452cc47f61121da3a776ee6a55c321c175043a51f1025d08126b1afb66ac64736f6c63430008100033",
    class: {
      contractKind: "contract",
      id: "0",
      kind: "native",
      payable: false,
      typeClass: "contract",
      typeName: "ZeroParam"
    },
    decodingMode: "full",
    interpretations: {},
    kind: "constructor"
  },
  simpleStorage: {
    abi: {
      type: "constructor",
      inputs: [
        { name: "initialValue", type: "uint256", internalType: "uint256" }
      ],
      stateMutability: "nonpayable"
    },
    arguments: [
      {
        name: "initialValue",
        value: {
          kind: "value",
          type: { bits: 256, typeClass: "uint", typeHint: "uint256" },
          interpretations: {},
          value: { asBN: new BN(100) }
        }
      }
    ],
    bytecode:
      "0x608060405234801561001057600080fd5b506040516102063803806102068339818101604052810190610032919061007a565b80600081905550506100a7565b600080fd5b6000819050919050565b61005781610044565b811461006257600080fd5b50565b6000815190506100748161004e565b92915050565b6000602082840312156100905761008f61003f565b5b600061009e84828501610065565b91505092915050565b610150806100b66000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632f048afa1461003b57806357de26a414610057575b600080fd5b610055600480360381019061005091906100c3565b610075565b005b61005f61007f565b60405161006c91906100ff565b60405180910390f35b8060008190555050565b60008054905090565b600080fd5b6000819050919050565b6100a08161008d565b81146100ab57600080fd5b50565b6000813590506100bd81610097565b92915050565b6000602082840312156100d9576100d8610088565b5b60006100e7848285016100ae565b91505092915050565b6100f98161008d565b82525050565b600060208201905061011460008301846100f0565b9291505056fea26469706673582212209f5a1b69263a7555164696f462a9b79047f852598ba352e8839ea7d17db230bc64736f6c634300081000330000000000000000000000000000000000000000000000000000000000000064",
    class: {
      contractKind: "contract",
      id: "1",
      kind: "native",
      payable: false,
      typeClass: "contract",
      typeName: "SimpleStorage"
    },
    decodingMode: "full",
    interpretations: {},
    kind: "constructor"
  },
  manyParams: {
    abi: {
      type: "constructor",
      inputs: [
        {
          internalType: "bool",
          name: "potato",
          type: "bool"
        },
        {
          internalType: "bool[]",
          name: "tomato",
          type: "bool[]"
        },
        {
          internalType: "bytes",
          name: "b",
          type: "bytes"
        },
        {
          internalType: "bytes[]",
          name: "abc",
          type: "bytes[]"
        },
        {
          internalType: "bytes1",
          name: "b1",
          type: "bytes1"
        },
        {
          internalType: "bytes2",
          name: "b2",
          type: "bytes2"
        },
        {
          internalType: "bytes5",
          name: "b5",
          type: "bytes5"
        },
        {
          internalType: "int256",
          name: "i",
          type: "int256"
        },
        {
          internalType: "int8",
          name: "i8",
          type: "int8"
        },
        {
          internalType: "int32",
          name: "i32",
          type: "int32"
        },
        {
          internalType: "int32[]",
          name: "foo",
          type: "int32[]"
        },
        {
          internalType: "uint56",
          name: "ui56",
          type: "uint56"
        },
        {
          internalType: "uint128",
          name: "ui128",
          type: "uint128"
        },
        {
          internalType: "uint192",
          name: "ui192",
          type: "uint192"
        },
        {
          internalType: "uint256",
          name: "ui256",
          type: "uint256"
        },
        {
          internalType: "string",
          name: "s",
          type: "string"
        },
        {
          internalType: "string[][]",
          name: "nest",
          type: "string[][]"
        },
        {
          internalType: "enum ManyParams.SomeState",
          name: "initialState",
          type: "uint8"
        }
      ],
      stateMutability: "nonpayable"
    },
    arguments: [
      {
        name: "potato",
        value: {
          type: { typeClass: "bool", typeHint: "bool" },
          kind: "value",
          interpretations: {},
          value: { asBoolean: true }
        }
      },
      {
        name: "tomato",
        value: {
          type: {
            typeClass: "array",
            baseType: { typeClass: "bool", typeHint: "bool" },
            kind: "dynamic",
            location: "memory",
            typeHint: "bool[]"
          },
          kind: "value",
          interpretations: {},
          value: [
            {
              type: { typeClass: "bool", typeHint: "bool" },
              kind: "value",
              interpretations: {},
              value: { asBoolean: true }
            },
            {
              type: { typeClass: "bool", typeHint: "bool" },
              kind: "value",
              interpretations: {},
              value: { asBoolean: true }
            },
            {
              type: { typeClass: "bool", typeHint: "bool" },
              kind: "value",
              interpretations: {},
              value: { asBoolean: false }
            },
            {
              type: { typeClass: "bool", typeHint: "bool" },
              kind: "value",
              interpretations: {},
              value: { asBoolean: true }
            },
            {
              type: { typeClass: "bool", typeHint: "bool" },
              kind: "value",
              interpretations: {},
              value: { asBoolean: false }
            }
          ]
        }
      },
      {
        name: "b",
        value: {
          type: {
            typeClass: "bytes",
            kind: "dynamic",
            location: "memory",
            typeHint: "bytes"
          },
          kind: "value",
          interpretations: {},
          value: { asHex: "0x4444abcd" }
        }
      },
      {
        name: "abc",
        value: {
          type: {
            typeClass: "array",
            baseType: {
              typeClass: "bytes",
              kind: "dynamic",
              location: "storage",
              typeHint: "bytes"
            },
            kind: "dynamic",
            location: "memory",
            typeHint: "bytes[]"
          },
          kind: "value",
          interpretations: {},
          value: [
            {
              type: {
                typeClass: "bytes",
                kind: "dynamic",
                location: "storage",
                typeHint: "bytes"
              },
              kind: "value",
              interpretations: {},
              value: { asHex: "0x11" }
            },
            {
              type: {
                typeClass: "bytes",
                kind: "dynamic",
                location: "storage",
                typeHint: "bytes"
              },
              kind: "value",
              interpretations: {},
              value: { asHex: "0x0abcdabcdabc" }
            },
            {
              type: {
                typeClass: "bytes",
                kind: "dynamic",
                location: "storage",
                typeHint: "bytes"
              },
              kind: "value",
              interpretations: {},
              value: {
                asHex:
                  "0xd349dae33663361c6a60414dcf4ed82f0578ce7d6b3bf5b9f4dec6515420a29a"
              }
            }
          ]
        }
      },
      {
        name: "b1",
        value: {
          type: {
            typeClass: "bytes",
            kind: "static",
            length: 1,
            typeHint: "bytes1"
          },
          kind: "value",
          interpretations: {},
          value: {
            asHex: "0xac",
            rawAsHex:
              "0xac00000000000000000000000000000000000000000000000000000000000000"
          }
        }
      },
      {
        name: "b2",
        value: {
          type: {
            typeClass: "bytes",
            kind: "static",
            length: 2,
            typeHint: "bytes2"
          },
          kind: "value",
          interpretations: {},
          value: {
            asHex: "0xabcd",
            rawAsHex:
              "0xabcd000000000000000000000000000000000000000000000000000000000000"
          }
        }
      },
      {
        name: "b5",
        value: {
          type: {
            typeClass: "bytes",
            kind: "static",
            length: 5,
            typeHint: "bytes5"
          },
          kind: "value",
          interpretations: {},
          value: {
            asHex: "0x3a01200000",
            rawAsHex:
              "0x3a01200000000000000000000000000000000000000000000000000000000000"
          }
        }
      },
      {
        name: "i",
        value: {
          type: { typeClass: "int", bits: 256, typeHint: "int256" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN(1) }
        }
      },
      {
        name: "i8",
        value: {
          type: { typeClass: "int", bits: 8, typeHint: "int8" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN(0) }
        }
      },
      {
        name: "i32",
        value: {
          type: { typeClass: "int", bits: 32, typeHint: "int32" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN(64) }
        }
      },
      {
        name: "foo",
        value: {
          type: {
            typeClass: "array",
            baseType: { typeClass: "int", bits: 32, typeHint: "int32" },
            kind: "dynamic",
            location: "memory",
            typeHint: "int32[]"
          },
          kind: "value",
          interpretations: {},
          value: [
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(300) }
            },
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(400) }
            },
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(500) }
            },
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(600) }
            },
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(700) }
            },
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(800) }
            },
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(900) }
            },
            {
              type: { typeClass: "int", bits: 32, typeHint: "int32" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN(1500) }
            }
          ]
        }
      },
      {
        name: "ui56",
        value: {
          type: { typeClass: "uint", bits: 56, typeHint: "uint56" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN(2) }
        }
      },
      {
        name: "ui128",
        value: {
          type: { typeClass: "uint", bits: 128, typeHint: "uint128" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN(12345) }
        }
      },
      {
        name: "ui192",
        value: {
          type: { typeClass: "uint", bits: 192, typeHint: "uint192" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("0fffff", 16) }
        }
      },
      {
        name: "ui256",
        value: {
          type: { typeClass: "uint", bits: 256, typeHint: "uint256" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("3fffffff", 16) }
        }
      },
      {
        name: "s",
        value: {
          type: { typeClass: "string", location: "memory", typeHint: "string" },
          kind: "value",
          interpretations: {},
          value: {
            kind: "valid",
            asString:
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus iaculis rutrum felis, a pulvinar mauris molestie et. Vestibulum convallis sollicitudin finibus. Sed eget viverra leo, quis malesuada arcu."
          }
        }
      },
      {
        name: "nest",
        value: {
          type: {
            typeClass: "array",
            baseType: {
              typeClass: "array",
              baseType: {
                typeClass: "string",
                location: "storage",
                typeHint: "string"
              },
              kind: "dynamic",
              location: "storage",
              typeHint: "string[]"
            },
            kind: "dynamic",
            location: "memory",
            typeHint: "string[][]"
          },
          kind: "value",
          interpretations: {},
          value: [
            {
              type: {
                typeClass: "array",
                baseType: {
                  typeClass: "string",
                  location: "storage",
                  typeHint: "string"
                },
                kind: "dynamic",
                location: "storage",
                typeHint: "string[]"
              },
              kind: "value",
              interpretations: {},
              value: [
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: {
                    kind: "valid",
                    asString: "0x02c96a953c77365e5906049c697a0de36e4ff155"
                  }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: {
                    kind: "valid",
                    asString: "0xbba111bca8fcd108aed72cfd0537582963140aef"
                  }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: {
                    kind: "valid",
                    asString: "0x147aa883c7e892c4bd6db61b2fcffe81446b269e"
                  }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: {
                    kind: "valid",
                    asString: "0x3a10ef80d8fbd1cbe88cd1e332ec54a710601c8e"
                  }
                }
              ]
            },
            {
              type: {
                typeClass: "array",
                baseType: {
                  typeClass: "string",
                  location: "storage",
                  typeHint: "string"
                },
                kind: "dynamic",
                location: "storage",
                typeHint: "string[]"
              },
              kind: "value",
              interpretations: {},
              value: [
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "apple" }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "apple pie" }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "apple strudel" }
                }
              ]
            },
            {
              type: {
                typeClass: "array",
                baseType: {
                  typeClass: "string",
                  location: "storage",
                  typeHint: "string"
                },
                kind: "dynamic",
                location: "storage",
                typeHint: "string[]"
              },
              kind: "value",
              interpretations: {},
              value: [
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "banana" }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "banana bread" }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "banana pudding" }
                }
              ]
            },
            {
              type: {
                typeClass: "array",
                baseType: {
                  typeClass: "string",
                  location: "storage",
                  typeHint: "string"
                },
                kind: "dynamic",
                location: "storage",
                typeHint: "string[]"
              },
              kind: "value",
              interpretations: {},
              value: [
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "blueberry" }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "blueberry muffin" }
                },
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: { kind: "valid", asString: "blueberry cobbler" }
                }
              ]
            },
            {
              type: {
                typeClass: "array",
                baseType: {
                  typeClass: "string",
                  location: "storage",
                  typeHint: "string"
                },
                kind: "dynamic",
                location: "storage",
                typeHint: "string[]"
              },
              kind: "value",
              interpretations: {},
              value: [
                {
                  type: {
                    typeClass: "string",
                    location: "storage",
                    typeHint: "string"
                  },
                  kind: "value",
                  interpretations: {},
                  value: {
                    kind: "valid",
                    asString: "0x7c0b5b89db61166a56243ee50f2dd52be208bb2a"
                  }
                }
              ]
            }
          ]
        }
      },
      {
        name: "initialState",
        value: {
          type: {
            typeClass: "enum",
            kind: "local",
            id: "shimmedcompilationNumber(0):7",
            typeName: "SomeState",
            definingContractName: "ManyParams",
            definingContract: {
              typeClass: "contract",
              kind: "native",
              id: "shimmedcompilationNumber(0):91",
              typeName: "ManyParams",
              contractKind: "contract",
              payable: false
            },
            options: ["PreparingToDo", "Doing", "Done", "MightDo", "WontDo"]
          },
          kind: "value",
          interpretations: {},
          value: {
            name: "Doing",
            numericAsBN: new BN(1)
          }
        }
      }
    ],
    bytecode:
      "0x608060405234620002f5576200098780380390816200001e8162000427565b918239610240818381010312620002f5576200003a8162000463565b5060208101516001600160401b038111620002f557810190828101601f83011215620002f55781519160206200007a620000748562000471565b62000427565b848152016020600594851b830101918584018311620002f557602001905b8282106200040c5750505060408101516001600160401b038111620002f557620000c89084830190830162000489565b5060608101516001600160401b038111620002f5578101838201601f82011215620002f55780519060208062000102620000748562000471565b8481520192851b820101918584018311620002f55760208201905b838210620003d8575050505060808101517fff00000000000000000000000000000000000000000000000000000000000000811603620002f55760a08101516001600160f01b0319811603620002f55760c08101516001600160d81b0319811603620002f5576101008101518060000b03620002f557620001a26101208201620004fb565b506101408101516001600160401b038111620002f5578101838201601f82011215620002f5578051602080620001dc620000748462000471565b8381520191851b830101918584018311620002f557602001905b828210620003bd5750505061016081015166ffffffffffffff811603620002f5576101808101516001600160801b03811603620002f5576101a08101516001600160c01b03811603620002f5576101e08101516001600160401b038111620002f557620002699084830190830162000489565b50610200810151926001600160401b038411620002f557808201601f858401011215620002f55783820151906020620002a6620000748462000471565b8381520194818401602084871b838701010111620002f557602081850101955b602084871b83870101018710620002fa57856102208601511015620002f55760405161047c90816200050b8239f35b600080fd5b86516001600160401b038111620002f557838601603f8285890101011215620002f5576020818488010101519062000336620000748362000471565b91602083828152018689016040838c1b85898d0101010111620002f557604083878b010101905b6040838c1b85898d01010101821062000384575050509082525060209687019601620002c6565b81516001600160401b038111620002f557602091620003b18c60408594898d8f8501940101010162000489565b8152019101906200035d565b60208091620003cc84620004fb565b815201910190620001f6565b81516001600160401b038111620002f557602091620004008392838b8a019188010162000489565b8152019101906200011d565b602080916200041b8462000463565b81520191019062000098565b6040519190601f01601f191682016001600160401b038111838210176200044d57604052565b634e487b7160e01b600052604160045260246000fd5b51908115158203620002f557565b6001600160401b0381116200044d5760051b60200190565b919080601f84011215620002f55782516001600160401b0381116200044d57602090620004bf601f8201601f1916830162000427565b92818452828287010111620002f55760005b818110620004e757508260009394955001015290565b8581018301518482018401528201620004d1565b51908160030b8203620002f55756fe6080604052600436101561001257600080fd5b6000803560e01c632b550a811461002857600080fd5b346103ef576101a03660031901126103ef576001600160a01b03600435818116036103ca57602490813567ffffffffffffffff81116103c657366023820112156103c6578060040135918360206100866100818661042e565b6103f2565b858152019360051b830101913683116103c2578401925b8284106103d25785856044356fffffffffffffffffffffffffffffffff198116036103ca5760643567ffffffffffffffff198116036103ca5760c43567ffffffffffffffff81116103ce57366023820112156103ce5780600401359067ffffffffffffffff82116103c6578290369260051b0101116103ca5760e43560ff8116036103ca576101043580600c0b036103ca57610124358060130b036103ca576101443580601b0b036103ca5767ffffffffffffffff61018435116103ca57366023610184350112156103ca576101843560040135602061017f6100818361042e565b828152019136818360051b610184350101116103c657806101843501925b818360051b61018435010184106101b45784604051f35b833567ffffffffffffffff81116103c2573660438261018435010112156103c257828161018435010135906101eb6100818361042e565b9160208382815201913660448360051b8361018435010101116103be57908160448796959493610184350101925b60448360051b83610184350101018410610242575050509082525060209485019401905061019d565b90919280949596503567ffffffffffffffff81116103ba5736606382856101843501010112156103ba57604481846101843501010135906102856100818361042e565b9160208382815201913660648360051b83896101843501010101116103b6576064818761018435010101925b60648360051b8389610184350101010184106102e0575050509082525086959493602090810193929101610219565b839e9d9c9b9a9e3567ffffffffffffffff81116103b25736608382858b610184350101010112156103b257606481848a610184350101010135906103266100818361042e565b9160208382815201913660848c83898660051b92610184350101010101116103ac57608481878d6101843501010101925b60848c83898660051b92610184350101010101841061038b57505050509d9e9a9b9c9d8160209291839252019301926102b1565b833560058110156103a457815260209384019301610357565b505050508f80fd5b50508f80fd5b8e80fd5b8d80fd5b8a80fd5b8880fd5b8580fd5b8380fd5b5080fd5b8280fd5b833582811681036103eb5781526020938401930161009d565b8680fd5b80fd5b6040519190601f01601f1916820167ffffffffffffffff81118382101761041857604052565b634e487b7160e01b600052604160045260246000fd5b67ffffffffffffffff81116104185760051b6020019056fea264697066735822122027a065f88c98c588c8b6a418c1006d767d7128a77fe1b01c03ec37f25f502e9064736f6c63430008100033",
    class: {
      contractKind: "contract",
      id: "2",
      kind: "native",
      payable: false,
      typeClass: "contract",
      typeName: "ManyParams"
    },
    decodingMode: "full",
    interpretations: {},
    kind: "constructor"
  }
} satisfies Record<string, ConstructorDecoding>;
