pragma solidity ^0.8.0;

import "./InheritB.sol";

// These are out of alphabetic order
// Solc will alphabetize them, we should restore source-order.
contract InheritA is InheritB {
  event LogB();
  event LogA();
  constructor() {}
}

contract ComplexOrdered is InheritA {
  function theFirst() public pure {}
  function second() public pure {}
  function andThird() public pure {}
}

contract Empty {}
