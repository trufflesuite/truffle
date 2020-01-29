pragma solidity ^0.5.0;

contract Example {
  uint public value;
  bool public fallbackTriggered;
  event ExampleEvent(address indexed _from, uint num);

  constructor(uint val) public {
    value = val;
    fallbackTriggered = false;
  }

  function setValue(uint val) public {
    value = val;
  }

  function getValue() public view returns(uint) {
    return value;
  }

  function parrot(uint val) public returns(uint) {
    return val;
  }

  function triggerEvent() public {
    emit ExampleEvent(msg.sender, 8);
  }

  function() external payable {
    fallbackTriggered = true;
  }
}
