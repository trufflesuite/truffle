import type { FunctionDecoding } from "@truffle/codec";
import BN from "bn.js";

export default {
  zeroParamA: {
    kind: "function",
    class: {
      typeClass: "contract",
      kind: "native",
      id: "shimmedcompilationNumber(1):150",
      typeName: "ZeroParam",
      contractKind: "contract",
      payable: false
    },
    abi: {
      inputs: [],
      name: "a",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    arguments: [],
    selector: "0x0dbe671f",
    decodingMode: "full",
    interpretations: {}
  },
  simpleStorageWrite: {
    kind: "function",
    class: {
      typeClass: "contract",
      kind: "native",
      id: "shimmedcompilationNumber(1):200",
      typeName: "SimpleStorage",
      contractKind: "contract",
      payable: false
    },
    abi: {
      inputs: [{ internalType: "uint256", name: "newValue", type: "uint256" }],
      name: "write",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    arguments: [
      {
        name: "newValue",
        value: {
          type: { typeClass: "uint", bits: 256, typeHint: "uint256" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("0dbba0", 16) }
        }
      }
    ],
    selector: "0x2f048afa",
    decodingMode: "full",
    interpretations: {}
  },
  manyParamsDoSomething: {
    kind: "function",
    class: {
      typeClass: "contract",
      kind: "native",
      id: "shimmedcompilationNumber(0):100",
      typeName: "ManyParams",
      contractKind: "contract",
      payable: false
    },
    abi: {
      inputs: [
        { internalType: "address", name: "poBox", type: "address" },
        { internalType: "address[]", name: "poBoxes", type: "address[]" },
        { internalType: "bytes16", name: "b16", type: "bytes16" },
        { internalType: "bytes24", name: "b24", type: "bytes24" },
        { internalType: "bytes32", name: "b32", type: "bytes32" },
        { internalType: "uint256", name: "ui", type: "uint256" },
        { internalType: "uint256[]", name: "positiveNums", type: "uint256[]" },
        { internalType: "uint8", name: "ui8", type: "uint8" },
        { internalType: "int104", name: "i104", type: "int104" },
        { internalType: "int160", name: "i160", type: "int160" },
        { internalType: "int224", name: "i224", type: "int224" },
        { internalType: "int256", name: "i256", type: "int256" },
        {
          internalType: "enum ManyParams.SomeState[][][][]",
          name: "states",
          type: "uint8[][][][]"
        }
      ],
      name: "doSomething",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    arguments: [
      {
        name: "poBox",
        value: {
          type: {
            typeClass: "address",
            kind: "specific",
            payable: false
          },
          kind: "value",
          interpretations: {},
          value: {
            asAddress: "0x1F2840375219063b062fAF1DD54C50E72C830c23",
            rawAsHex:
              "0x0000000000000000000000001f2840375219063b062faf1dd54c50e72c830c23"
          }
        }
      },
      {
        name: "poBoxes",
        value: {
          type: {
            typeClass: "array",
            baseType: {
              typeClass: "address",
              kind: "specific",
              payable: false
            },
            kind: "dynamic",
            location: "memory",
            typeHint: "address[]"
          },
          kind: "value",
          interpretations: {},
          value: [
            {
              type: { typeClass: "address", kind: "specific", payable: false },
              kind: "value",
              interpretations: {},
              value: {
                asAddress: "0x66CF54433C250763D8F35342C739E142C49F7c23",
                rawAsHex:
                  "0x00000000000000000000000066cf54433c250763d8f35342c739e142c49f7c23"
              }
            },
            {
              type: { typeClass: "address", kind: "specific", payable: false },
              kind: "value",
              interpretations: {},
              value: {
                asAddress: "0x09D92B419e54C307B898020a16360a4DFC5a050C",
                rawAsHex:
                  "0x00000000000000000000000009d92b419e54c307b898020a16360a4dfc5a050c"
              }
            },
            {
              type: { typeClass: "address", kind: "specific", payable: false },
              kind: "value",
              interpretations: {},
              value: {
                asAddress: "0x20B866F025E6C2f6d7bF613dF14D65032542bDE0",
                rawAsHex:
                  "0x00000000000000000000000020b866f025e6c2f6d7bf613df14d65032542bde0"
              }
            },
            {
              type: { typeClass: "address", kind: "specific", payable: false },
              kind: "value",
              interpretations: {},
              value: {
                asAddress: "0x5efd907fFA4fBEE4F766A94d1Ff553777e3EFc80",
                rawAsHex:
                  "0x0000000000000000000000005efd907ffa4fbee4f766a94d1ff553777e3efc80"
              }
            },
            {
              type: { typeClass: "address", kind: "specific", payable: false },
              kind: "value",
              interpretations: {},
              value: {
                asAddress: "0x51f85aAf9577c59B0Ba3c47E2F290f9e04C49e57",
                rawAsHex:
                  "0x00000000000000000000000051f85aaf9577c59b0ba3c47e2f290f9e04c49e57"
              }
            },
            {
              type: { typeClass: "address", kind: "specific", payable: false },
              kind: "value",
              interpretations: {},
              value: {
                asAddress: "0x34399Dc1db663BCeE33a93ba59D3CC12B96feD52",
                rawAsHex:
                  "0x00000000000000000000000034399dc1db663bcee33a93ba59d3cc12b96fed52"
              }
            },
            {
              type: { typeClass: "address", kind: "specific", payable: false },
              kind: "value",
              interpretations: {},
              value: {
                asAddress: "0x6820BbF6c2D50a035A0f2639bFc220b56d9236e5",
                rawAsHex:
                  "0x0000000000000000000000006820bbf6c2d50a035a0f2639bfc220b56d9236e5"
              }
            }
          ]
        }
      },
      {
        name: "b16",
        value: {
          type: {
            typeClass: "bytes",
            kind: "static",
            length: 16,
            typeHint: "bytes16"
          },
          kind: "value",
          interpretations: {},
          value: {
            asHex: "0x0000970d38b413954fd8225f6a5f2293",
            rawAsHex:
              "0x0000970d38b413954fd8225f6a5f229300000000000000000000000000000000"
          }
        }
      },
      {
        name: "b24",
        value: {
          type: {
            typeClass: "bytes",
            kind: "static",
            length: 24,
            typeHint: "bytes24"
          },
          kind: "value",
          interpretations: {},
          value: {
            asHex: "0xfea5cabf4dc5cf39483e14ae2139eea34f4d4513372394ec",
            rawAsHex:
              "0xfea5cabf4dc5cf39483e14ae2139eea34f4d4513372394ec0000000000000000"
          }
        }
      },
      {
        name: "b32",
        value: {
          type: {
            typeClass: "bytes",
            kind: "static",
            length: 32,
            typeHint: "bytes32"
          },
          kind: "value",
          interpretations: {},
          value: {
            asHex:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            rawAsHex:
              "0x0000000000000000000000000000000000000000000000000000000000000000"
          }
        }
      },
      {
        name: "ui",
        value: {
          type: { typeClass: "uint", bits: 256, typeHint: "uint256" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("09fbf1", 16) }
        }
      },
      {
        name: "positiveNums",
        value: {
          type: {
            typeClass: "array",
            baseType: { typeClass: "uint", bits: 256, typeHint: "uint256" },
            kind: "dynamic",
            location: "calldata",
            typeHint: "uint256[]"
          },
          kind: "value",
          interpretations: {},
          value: [
            {
              type: { typeClass: "uint", bits: 256, typeHint: "uint256" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("6acfc0", 16) }
            },
            {
              type: { typeClass: "uint", bits: 256, typeHint: "uint256" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("02faf080", 16) }
            },
            {
              type: { typeClass: "uint", bits: 256, typeHint: "uint256" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("11e1a300", 16) }
            },
            {
              type: { typeClass: "uint", bits: 256, typeHint: "uint256" },
              kind: "value",
              interpretations: {},
              value: { asBN: new BN("3b9aca00", 16) }
            }
          ]
        }
      },
      {
        name: "ui8",
        value: {
          type: { typeClass: "uint", bits: 8, typeHint: "uint8" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN(8) }
        }
      },
      {
        name: "i104",
        value: {
          type: { typeClass: "int", bits: 104, typeHint: "int104" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("0d80", 16) }
        }
      },
      {
        name: "i160",
        value: {
          type: { typeClass: "int", bits: 160, typeHint: "int160" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("01e240", 16) }
        }
      },
      {
        name: "i224",
        value: {
          type: { typeClass: "int", bits: 224, typeHint: "int224" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("f0", 16) }
        }
      },
      {
        name: "i256",
        value: {
          type: { typeClass: "int", bits: 256, typeHint: "int256" },
          kind: "value",
          interpretations: {},
          value: { asBN: new BN("02540be3ff", 16) }
        }
      },
      {
        name: "states",
        value: {
          type: {
            typeClass: "array",
            baseType: {
              typeClass: "array",
              baseType: {
                typeClass: "array",
                baseType: {
                  typeClass: "array",
                  baseType: {
                    typeClass: "enum",
                    kind: "local",
                    id: "shimmedcompilationNumber(0):0",
                    typeName: "SomeState",
                    definingContractName: "ManyParams"
                  },
                  kind: "dynamic",
                  location: "storage",
                  typeHint: "enum ManyParams.SomeState[]"
                },
                kind: "dynamic",
                location: "storage",
                typeHint: "enum ManyParams.SomeState[][]"
              },
              kind: "dynamic",
              location: "storage",
              typeHint: "enum ManyParams.SomeState[][][]"
            },
            kind: "dynamic",
            location: "memory",
            typeHint: "enum ManyParams.SomeState[][][][]"
          },
          kind: "value",
          interpretations: {},
          value: [
            {
              type: {
                typeClass: "array",
                baseType: {
                  typeClass: "array",
                  baseType: {
                    typeClass: "array",
                    baseType: {
                      typeClass: "enum",
                      kind: "local",
                      id: "shimmedcompilationNumber(0):1",
                      typeName: "SomeState",
                      definingContractName: "ManyParams"
                    },
                    kind: "dynamic",
                    location: "storage",
                    typeHint: "enum ManyParams.SomeState[]"
                  },
                  kind: "dynamic",
                  location: "storage",
                  typeHint: "enum ManyParams.SomeState[][]"
                },
                kind: "dynamic",
                location: "storage",
                typeHint: "enum ManyParams.SomeState[][][]"
              },
              kind: "value",
              interpretations: {},
              value: [
                {
                  type: {
                    typeClass: "array",
                    baseType: {
                      typeClass: "array",
                      baseType: {
                        typeClass: "enum",
                        kind: "local",
                        id: "shimmedcompilationNumber(0):1",
                        typeName: "SomeState",
                        definingContractName: "ManyParams"
                      },
                      kind: "dynamic",
                      location: "storage",
                      typeHint: "enum ManyParams.SomeState[]"
                    },
                    kind: "dynamic",
                    location: "storage",
                    typeHint: "enum ManyParams.SomeState[][]"
                  },
                  kind: "value",
                  interpretations: {},
                  value: [
                    {
                      type: {
                        typeClass: "array",
                        baseType: {
                          typeClass: "enum",
                          kind: "local",
                          id: "shimmedcompilationNumber(0):1",
                          typeName: "SomeState",
                          definingContractName: "ManyParams"
                        },
                        kind: "dynamic",
                        location: "storage",
                        typeHint: "enum ManyParams.SomeState[]"
                      },
                      kind: "value",
                      interpretations: {},
                      value: [
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):1",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Done", numericAsBN: new BN(2) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "WontDo", numericAsBN: new BN(4) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Done", numericAsBN: new BN(2) }
                        }
                      ]
                    },
                    {
                      type: {
                        typeClass: "array",
                        baseType: {
                          typeClass: "enum",
                          kind: "local",
                          id: "shimmedcompilationNumber(0):0",
                          typeName: "SomeState",
                          definingContractName: "ManyParams"
                        },
                        kind: "dynamic",
                        location: "storage",
                        typeHint: "enum ManyParams.SomeState[]"
                      },
                      kind: "value",
                      interpretations: {},
                      value: [
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "WontDo", numericAsBN: new BN(4) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "WontDo", numericAsBN: new BN(4) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "WontDo", numericAsBN: new BN(4) }
                        }
                      ]
                    },
                    {
                      type: {
                        typeClass: "array",
                        baseType: {
                          typeClass: "enum",
                          kind: "local",
                          id: "shimmedcompilationNumber(0):0",
                          typeName: "SomeState",
                          definingContractName: "ManyParams"
                        },
                        kind: "dynamic",
                        location: "storage",
                        typeHint: "enum ManyParams.SomeState[]"
                      },
                      kind: "value",
                      interpretations: {},
                      value: [
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: {
                            name: "PreparingToDo",
                            numericAsBN: new BN(0)
                          }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Doing", numericAsBN: new BN(1) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Done", numericAsBN: new BN(2) }
                        }
                      ]
                    },
                    {
                      type: {
                        typeClass: "array",
                        baseType: {
                          typeClass: "enum",
                          kind: "local",
                          id: "shimmedcompilationNumber(0):0",
                          typeName: "SomeState",
                          definingContractName: "ManyParams"
                        },
                        kind: "dynamic",
                        location: "storage",
                        typeHint: "enum ManyParams.SomeState[]"
                      },
                      kind: "value",
                      interpretations: {},
                      value: [
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "WontDo", numericAsBN: new BN(4) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "WontDo", numericAsBN: new BN(4) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Done", numericAsBN: new BN(2) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Doing", numericAsBN: new BN(1) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Doing", numericAsBN: new BN(1) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Done", numericAsBN: new BN(2) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: {
                            name: "PreparingToDo",
                            numericAsBN: new BN(0)
                          }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: {
                            name: "PreparingToDo",
                            numericAsBN: new BN(0)
                          }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: {
                            name: "PreparingToDo",
                            numericAsBN: new BN(0)
                          }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Doing", numericAsBN: new BN(1) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Done", numericAsBN: new BN(2) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "MightDo", numericAsBN: new BN(3) }
                        },
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "WontDo", numericAsBN: new BN(4) }
                        }
                      ]
                    },
                    {
                      type: {
                        typeClass: "array",
                        baseType: {
                          typeClass: "enum",
                          kind: "local",
                          id: "shimmedcompilationNumber(0):0",
                          typeName: "SomeState",
                          definingContractName: "ManyParams"
                        },
                        kind: "dynamic",
                        location: "storage",
                        typeHint: "enum ManyParams.SomeState[]"
                      },
                      kind: "value",
                      interpretations: {},
                      value: [
                        {
                          type: {
                            typeClass: "enum",
                            kind: "local",
                            id: "shimmedcompilationNumber(0):0",
                            typeName: "SomeState",
                            definingContractName: "ManyParams",
                            definingContract: {
                              typeClass: "contract",
                              kind: "native",
                              id: "shimmedcompilationNumber(0):100",
                              typeName: "ManyParams",
                              contractKind: "contract",
                              payable: false
                            },
                            options: [
                              "PreparingToDo",
                              "Doing",
                              "Done",
                              "MightDo",
                              "WontDo"
                            ]
                          },
                          kind: "value",
                          interpretations: {},
                          value: { name: "Doing", numericAsBN: new BN(1) }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ],
    selector: "0x2b550a81",
    decodingMode: "full",
    interpretations: {}
  }
} satisfies Record<string, FunctionDecoding>;
