import type { Format } from "@truffle/codec";
import BN from "bn.js";

export default {
  address: {
    kind: "value",
    type: {
      typeClass: "array",
      baseType: { typeClass: "address", kind: "general" },
      kind: "dynamic",
      typeHint: "address[]"
    },
    interpretations: {},
    value: [
      {
        type: { typeClass: "address", kind: "general" },
        kind: "value",
        interpretations: {},
        value: { asAddress: "0x6a323a46f1415e0de8ac0e6ef9e61698257b741d" }
      },
      {
        type: { typeClass: "address", kind: "general" },
        kind: "value",
        interpretations: {},
        value: { asAddress: "0xcdf15294de72027c3e0e6bd9cd6b77b6b24d0311" }
      },
      {
        type: { typeClass: "address", kind: "general" },
        kind: "value",
        interpretations: {},
        value: { asAddress: "0x50981480a228a78979702ababd5e3d8dbc550a8f" }
      },
      {
        type: { typeClass: "address", kind: "general" },
        kind: "value",
        interpretations: {},
        value: { asAddress: "0x00b42be7d677f9bde88f97abab273cda6ca02add" }
      }
    ]
  },
  bool: {
    kind: "value",
    type: {
      typeClass: "array",
      baseType: { typeClass: "bool" },
      kind: "dynamic",
      location: "memory",
      typeHint: "bool[]"
    },
    interpretations: {},
    value: [
      {
        type: { typeClass: "bool" },
        kind: "value",
        interpretations: {},
        value: { asBoolean: true }
      },
      {
        type: { typeClass: "bool" },
        kind: "value",
        interpretations: {},
        value: { asBoolean: false }
      }
    ]
  },
  bytesDynamic: {
    kind: "value",
    type: {
      typeClass: "array",
      baseType: { typeClass: "bytes", kind: "dynamic" },
      kind: "dynamic",
      typeHint: "bytes[]"
    },
    interpretations: {},
    value: [
      {
        kind: "value",
        type: { typeClass: "bytes", kind: "dynamic" },
        interpretations: {},
        value: { asHex: "0xab" }
      },
      {
        kind: "value",
        type: { typeClass: "bytes", kind: "dynamic" },
        interpretations: {},
        value: { asHex: "0x0123456789ab" }
      },
      {
        kind: "value",
        type: { typeClass: "bytes", kind: "dynamic" },
        interpretations: {},
        value: {
          asHex:
            "0x81462808fe07692391d3cf0964ba03dd6235f1e3447c2140393649834862f0b7"
        }
      }
    ]
  },
  int: {
    kind: "value",
    type: {
      typeClass: "array",
      baseType: { typeClass: "int", bits: 32 },
      kind: "dynamic",
      typeHint: "int32[]"
    },
    interpretations: {},
    value: [
      {
        type: { typeClass: "int", bits: 32 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(10000) }
      },
      {
        type: { typeClass: "int", bits: 32 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(2) }
      },
      {
        type: { typeClass: "int", bits: 32 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(50) }
      },
      {
        type: { typeClass: "int", bits: 32 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(999) }
      },
      {
        type: { typeClass: "int", bits: 32 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(1234) }
      },
      {
        type: { typeClass: "int", bits: 32 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(898971) }
      }
    ]
  },
  string: {
    kind: "value",
    type: {
      typeClass: "array",
      baseType: { typeClass: "string" },
      kind: "dynamic",
      typeHint: "string[]"
    },
    interpretations: {},
    value: [
      {
        type: { typeClass: "string" },
        kind: "value",
        interpretations: {},
        value: { kind: "valid", asString: "@truffle" }
      },
      {
        type: { typeClass: "string" },
        kind: "value",
        interpretations: {},
        value: { kind: "valid", asString: "/codec-components" }
      }
    ]
  },
  uint: {
    kind: "value",
    type: {
      typeClass: "array",
      baseType: { typeClass: "uint", bits: 128 },
      kind: "dynamic",
      typeHint: "uint128[]"
    },
    interpretations: {},
    value: [
      {
        type: { typeClass: "uint", bits: 128 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(10000) }
      },
      {
        type: { typeClass: "uint", bits: 128 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(131072) }
      },
      {
        type: { typeClass: "uint", bits: 128 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(46213) }
      },
      {
        type: { typeClass: "uint", bits: 128 },
        kind: "value",
        interpretations: {},
        value: { asBN: new BN(0) }
      }
    ]
  },
  string2D: {
    kind: "value",
    type: {
      typeClass: "array",
      baseType: {
        typeClass: "array",
        baseType: { typeClass: "string" },
        kind: "dynamic",
        typeHint: "string[]"
      },
      kind: "dynamic",
      typeHint: "string[][]"
    },
    interpretations: {},
    value: [
      {
        kind: "value",
        type: {
          typeClass: "array",
          baseType: { typeClass: "string" },
          kind: "dynamic",
          typeHint: "string[]"
        },
        interpretations: {},
        value: [
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "bees" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "pollen" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "honey" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "beehives" }
          }
        ]
      },
      {
        kind: "value",
        type: {
          typeClass: "array",
          baseType: { typeClass: "string" },
          kind: "dynamic",
          typeHint: "string[]"
        },
        interpretations: {},
        value: [
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "tomato" }
          }
        ]
      },
      {
        kind: "value",
        type: {
          typeClass: "array",
          baseType: { typeClass: "string" },
          kind: "dynamic",
          typeHint: "string[]"
        },
        interpretations: {},
        value: [
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "sunlight" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "swim" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "moonlight" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "dance" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "country" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "England" }
          }
        ]
      },
      {
        kind: "value",
        type: {
          typeClass: "array",
          baseType: { typeClass: "string" },
          kind: "dynamic",
          typeHint: "string[]"
        },
        interpretations: {},
        value: [
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "pomelo" }
          },
          {
            kind: "value",
            type: { typeClass: "string" },
            interpretations: {},
            value: { kind: "valid", asString: "papaya" }
          }
        ]
      }
    ]
  }
} satisfies Record<string, Format.Values.ArrayValue>;
