pragma solidity 0.4.24;

import "./LeafA.sol";
import "./LeafB.sol";

contract Branch is LeafA, LeafB {
  uint branch;
}
