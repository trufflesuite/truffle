import chainIDtoNameJson from "src/assets/chainIDtoName.json";

export const EMOTION_KEY = "trfl";
export const COLOR_SCHEME_KEY = "trfl.dash.color-scheme";

export const decodableRpcMethodsArr = [
  "eth_sendTransaction",
  "personal_sign"
] as const;
export const decodableRpcMethods = new Set(decodableRpcMethodsArr);
export type DecodableRpcMethod = typeof decodableRpcMethodsArr[number];

export const interactiveRpcMethodsArr = [
  ...decodableRpcMethodsArr,
  "eth_decrypt",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4"
] as const;
export const interactiveRpcMethods = new Set(interactiveRpcMethodsArr);
export type InteractiveRpcMethod = typeof interactiveRpcMethodsArr[number];

export const unsupportedRpcMethodsArr = [
  "eth_sign",
  "eth_signTransaction"
] as const;
export const unsupportedRpcMethods = new Set(unsupportedRpcMethodsArr);
export type UnsupportedRpcMethod = typeof unsupportedRpcMethodsArr[number];

export const unsupportedMessageResponse = new Map<UnsupportedRpcMethod, string>(
  [
    [
      "eth_sign",
      `Method "eth_sign" is not supported by @truffle/dashboard, please use "personal_sign" instead`
    ],
    [
      "eth_signTransaction",
      `Method "eth_signTransaction" is not supported by @truffle/dashboard`
    ]
  ]
);

export const chainIDtoName = {
  ...chainIDtoNameJson
} as const;

export type knownChainID = keyof typeof chainIDtoName;
