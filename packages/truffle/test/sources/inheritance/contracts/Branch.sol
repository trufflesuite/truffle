pragma solidity ^0.5.0;

import "./LeafA.sol";
import "./LeafB.sol";

contract Branch is LeafA, LeafB {
  uint branch;
}
