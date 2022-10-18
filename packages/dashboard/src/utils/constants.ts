import chainIDtoNameJson from "src/assets/chainIDtoName.json";

export const EMOTION_KEY = "trfl";
export const COLOR_SCHEME_KEY = "trfl.dash.color-scheme";

export const INTERACTIVE_RPC_METHODS_ARR = [
  "eth_sendTransaction",
  "eth_decrypt",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "personal_sign"
] as const;
export const INTERACTIVE_RPC_METHODS = new Set(INTERACTIVE_RPC_METHODS_ARR);
export type INTERACTIVE_RPC_METHOD = typeof INTERACTIVE_RPC_METHODS_ARR[number];

export const UNSUPPORTED_RPC_METHODS_ARR = [
  "eth_sign",
  "eth_signTransaction"
] as const;
export const UNSUPPORTED_RPC_METHODS = new Set(UNSUPPORTED_RPC_METHODS_ARR);
export type UNSUPPORTED_RPC_METHOD = typeof UNSUPPORTED_RPC_METHODS_ARR[number];

export const unsupportedMessageResponse = new Map<
  UNSUPPORTED_RPC_METHOD,
  string
>([
  [
    "eth_sign",
    `Method "eth_sign" is not supported by @truffle/dashboard, please use "personal_sign" instead`
  ],
  [
    "eth_signTransaction",
    `Method "eth_signTransaction" is not supported by @truffle/dashboard`
  ]
]);

export const chainIDtoName = {
  ...chainIDtoNameJson
} as const;

export type knownChainID = keyof typeof chainIDtoName;
