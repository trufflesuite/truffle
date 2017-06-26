pragma solidity ^0.4.8;

// This name doesn't match its filename.
contract Contract {
  uint public specialValue = 1337;

  function setValue(uint _val) {
    specialValue = _val;
  }
}
