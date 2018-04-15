pragma solidity ^0.4.18;

import "./InheritB.sol";

// These are out of alphabetic order
// Solc will alphabetize them, we should restore source-order.
contract InheritA is InheritB {
  event LogB();
  event LogA();
  function InheritA() public {}
}

contract ComplexOrdered is InheritA {
  function theFirst() public pure {}
  function second() public pure {}
  function andThird() public pure {}
}

contract Empty {}