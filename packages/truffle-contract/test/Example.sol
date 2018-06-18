pragma solidity ^0.4.22;

contract Example {
  uint public value;
  uint public counter;
  bool public fallbackTriggered;
  event ExampleEvent(address indexed _from, uint num);

  constructor(uint val) {
    value = val;
    fallbackTriggered = false;
  }

  function setValue(uint val) {
    value = val;
  }

  function getValue() constant returns(uint) {
    return value;
  }

  function parrot(uint val) returns(uint) {
    return val;
  }

  function triggerEvent() {
    ExampleEvent(msg.sender, 8);
  }

  function triggerRequireError() {
    require(false);
  }

  function triggerAssertError() {
    assert(false);
  }

  function runsOutOfGas() {
    consumesGas();
  }

  function consumesGas() {
    for(uint i = 0; i < 10000; i++){
      counter = i;
    }
  }

  function() payable {
    fallbackTriggered = true;
  }
}
