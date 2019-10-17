
declare module "abi-decoder" {
  function addABI(abi: any): void;
  function decodeMethod(data: any): any;
  function decodeLogs(logs: any[]): any;
}