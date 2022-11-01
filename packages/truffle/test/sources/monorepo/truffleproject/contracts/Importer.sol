pragma solidity ^0.5.0;

import "nodepkg/LocalNodeImport.sol";
import "nodepkg/NodeImport.sol";

contract Importer is LocalNodeImport, NodeImport {
  uint local;
  constructor() public {}
}
