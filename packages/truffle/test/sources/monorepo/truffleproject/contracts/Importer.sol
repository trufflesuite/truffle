pragma solidity ^0.5.0;

import "nodepkg/LocalNodeImport.sol";
import "nodepkg/NodeImport.sol";
import "ethpmpkg/EthPMImport.sol";

contract Importer is LocalNodeImport, NodeImport, EthPMImport {
  uint local;
  constructor() public {}
}
