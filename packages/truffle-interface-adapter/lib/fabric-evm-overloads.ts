import Web3 from "web3";

// The ts-ignores are ignoring the checks that are
// saying that web3.eth.net.getId is a function and doesn't
// have a `method` property, which it does

export function getId(web3: Web3) {
  // @ts-ignore
  const _oldGetIdFormatter = web3.eth.net.getId.method.outputFormatter;
  // @ts-ignore
  web3.eth.net.getId.method.outputFormatter = (hexId: any) => {
    // chaincode-fabric-evm currently returns a "fabric-evm" string
    // instead of a hex networkID. Instead of trying to decode the hexToNumber,
    // let's just accept `fabric-evm` as a valid networkID for now.
    return hexId;
  };
};