pragma solidity 0.4.24;

import "./Branch.sol";
import "./LeafC.sol";
import "./LibraryA.sol";

contract Root is Branch {
  uint root;

  function addToRoot(uint a, uint b) public {
    root = LibraryA.add(a, b);
  }

  function seeRoot() constant returns (uint) {
    return root;
  }
}
