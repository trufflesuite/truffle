//SPDX-License-Identifier: MIT
pragma solidity >= 0.4.3 < 0.9.0;

contract SafeSend {
  function deliver(address recipient) public {
    assembly {
      selfdestruct(recipient)
    }
  }
}
