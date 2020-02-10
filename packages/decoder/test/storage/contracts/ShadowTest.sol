pragma solidity ^0.5.12;

contract ShadowBase {
  uint x = 1;
  uint y = 2;
}

contract ShadowDerived is ShadowBase {
  uint x = 3;
  uint z = 4;
}
