pragma solidity ^0.4.22;

contract OldSafeSend {
  address public recipient;

  constructor(address _recipient) payable {
    recipient = _recipient;
  }

  function deliver() {
    selfdestruct(recipient);
  }
}
