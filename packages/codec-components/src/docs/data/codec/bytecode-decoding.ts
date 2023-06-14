import type { BytecodeDecoding } from "@truffle/codec";

export default {
  simpleStorage: {
    address: "0xe3238559f8E6b152ddc9192e1ad7BD0B52323D03",
    bytecode:
      "0x6080806040526004361015601257600080fd5b600090813560e01c80632f048afa14604c576357de26a414603257600080fd5b3460485781600319360112604857602091548152f35b5080fd5b503460485760203660031901126048576004358255f3fea26469706673582212205726fcdac728f1ee83ca2f99409fbb53fc339bf08fcc09cd015cc49a1fd9afcd64736f6c63430008100033",
    class: {
      contractKind: "contract",
      id: "10",
      kind: "native",
      payable: false,
      typeClass: "contract",
      typeName: "SimpleStorage"
    },
    decodingMode: "full",
    immutables: [],
    interpretations: {},
    kind: "bytecode",
    status: true
  }
} satisfies Record<string, BytecodeDecoding>;
