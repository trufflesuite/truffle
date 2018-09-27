
declare module "abi-decoder" {
  function addABI(abi: any): void;
  function decodeData(data: any): any;
  function decodeLogs(logs: any[]): any;
}