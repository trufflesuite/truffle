pragma solidity ^0.4.8;

contract Sender {
  function Sender(address recipient) payable {
    selfdestruct(recipient);
  }
}
