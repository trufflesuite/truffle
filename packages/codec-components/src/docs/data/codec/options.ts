import type { Options } from "@truffle/codec";
import BN from "bn.js";

export default {
  empty: {},
  notEmpty: {
    from: `0x${"01234".repeat(8)}`,
    to: `0x${"56789".repeat(8)}`,
    data: "0x",
    value: new BN(1000)
  }
} satisfies Record<string, Options>;
