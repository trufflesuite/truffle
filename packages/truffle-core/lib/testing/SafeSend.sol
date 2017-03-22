pragma solidity ^0.4.8;

contract SafeSend {
  address public recipient;
  
  function SafeSend(address _recipient) payable {
    recipient = _recipient;
  }

  function deliver() {
    selfdestruct(recipient);
  }
}
