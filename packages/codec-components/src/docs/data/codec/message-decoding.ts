import type { MessageDecoding } from "@truffle/codec";

export default {
  fallback: {
    abi: { type: "fallback", stateMutability: "nonpayable" },
    class: {
      typeClass: "contract",
      kind: "native",
      id: "shimmedcompilationNumber(0):10",
      typeName: "FallbackTest",
      contractKind: "contract",
      payable: false
    },
    data: "0x552079dc00000000000000000000000000000000000000000000000088888888",
    decodingMode: "full",
    interpretations: {},
    kind: "message"
  },
  receive: {
    abi: { type: "receive", stateMutability: "payable" },
    class: {
      typeClass: "contract",
      kind: "native",
      id: "shimmedcompilationNumber(0):10",
      typeName: "ReceiveTest",
      contractKind: "contract",
      payable: false
    },
    data: "0x0000000000000000000000000000000000000000000000000000000000000000",
    decodingMode: "full",
    interpretations: {},
    kind: "message"
  },
  noAbi: {
    abi: null,
    class: {
      typeClass: "contract",
      kind: "native",
      id: "shimmedcompilationNumber(0):10",
      typeName: "Mystery",
      contractKind: "contract",
      payable: false
    },
    data: "0x0000000000000000000000000000000000000000000000000000000000000000",
    decodingMode: "abi",
    interpretations: {},
    kind: "message"
  }
} satisfies Record<string, MessageDecoding>;
