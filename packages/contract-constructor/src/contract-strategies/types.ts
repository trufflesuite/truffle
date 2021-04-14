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

// export type ContractMethod = {
//   (...args: any[]): void;
//   call?: () => void;
//   sendTransaction?: () => void;
//   estimateGas: () => void;
//   request: () => void;
// };

// export const temp1: ContractMethod = Object.assign(
//   (...args: any[]) => { console.log(`default ${args}`); },
//   {
//     call: () => { console.log('call'); },
//     sendTransaction: () => { console.log('sendTransaction'); },
//     estimateGas: () => { console.log('estimateGas'); },
//     request: () => { console.log('request'); }
//   }
// );
