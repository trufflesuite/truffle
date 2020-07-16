//SPDX-License-Identifier: MIT
pragma solidity >= 0.5.0 < 0.7.0;

contract NewSafeSend {
  address payable public recipient;

  constructor(address payable _recipient) public payable {
    recipient = _recipient;
  }

  function deliver() public {
    selfdestruct(recipient);
  }
}
