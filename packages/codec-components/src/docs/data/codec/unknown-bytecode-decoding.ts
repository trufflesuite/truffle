import type { UnknownBytecodeDecoding } from "@truffle/codec";

export default {
  someContract: {
    bytecode:
      "0x6080806040526004361015601257600080fd5b600090813560e01c80632f048afa14604c576357de26a414603257600080fd5b3460485781600319360112604857602091548152f35b5080fd5b503460485760203660031901126048576004358255f3fea26469706673582212205726fcdac728f1ee83ca2f99409fbb53fc339bf08fcc09cd015cc49a1fd9afcd64736f6c63430008100033",
    decodingMode: "full",
    interpretations: {},
    kind: "unknownbytecode",
    status: true
  }
} satisfies Record<string, UnknownBytecodeDecoding>;
