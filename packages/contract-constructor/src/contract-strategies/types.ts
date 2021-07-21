export enum AllowedTxParams {
  from = "from",
  to = "to",
  gas = "gas",
  gasPrice = "gasPrice",
  value = "value",
  data = "data",
  nonce = "nonce",
  privateFor = "privateFor",
  overwrite = "overwrite",
  fee = "fee", // TODO BGC New param, confirm before merge
  storageLimit = "storageLimit" // TODO BGC New param, confirm before merge
}

export type TxParams = {[key in AllowedTxParams]?: any};

export type PrepareCallSettings = {
  isDeploy?: boolean
};
