pragma solidity ^0.5.0;

import "./InheritB.sol";

// These are out of alphabetic order
// Solc will alphabetize them, we should restore source-order.
contract InheritA is InheritB {
  event LogB();
  event LogA();
  constructor() public {}
}

contract ComplexOrdered is InheritA {
  function theFirst() public pure {}
  function second() public pure {}
  function andThird() public pure {}
}

contract Empty {}
