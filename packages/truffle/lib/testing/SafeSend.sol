pragma solidity ^0.4.8;

contract SafeSend {
  function SafeSend(address recipient) payable {
    selfdestruct(recipient);
  }
}
