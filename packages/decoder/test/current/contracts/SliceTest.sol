//SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;

//This contract is purely here to make sure that
//internal sources are generated, to make sure that the decoder
//doesn't choke on them

contract SliceTest {

  function slice(uint[] calldata arr) public pure returns (uint[] calldata) {
    return arr[1:arr.length - 1];
  }

}
