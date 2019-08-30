export type parsedUriObject = {
  genesis_hash?: string;
  block_hash?: string;
};

declare namespace BlockchainUtils {
  function parse(uri: string): parsedUriObject;
}
export default BlockchainUtils;
