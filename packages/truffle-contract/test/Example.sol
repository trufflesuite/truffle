contract Example {
  uint public value;
  uint public counter;
  bool public fallbackTriggered;
  event EmptyEvent();
  event ExampleEvent(address indexed _from, uint num);
  event ExampleEventII(address indexed _from, uint num);

  function Example(uint val) {
    require(val <= 1000);

    value = val;
    fallbackTriggered = false;
  }

  function setValue(uint val) {
    value = val;
  }

  function getValue() constant returns(uint) {
    return value;
  }

  function getValuePlus(uint toAdd) constant returns(uint) {
    return value + toAdd;
  }

  function overloadedGet() constant returns(uint){
    return value;
  }

  function overloadedGet(uint multiplier) constant returns(uint){
    return value * multiplier;
  }

  function overloadedSet(uint val) {
    value = val;
  }

  function overloadedSet(uint val, uint multiplier) {
    value = val * multiplier;
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

  function returnsTuple () view returns (uint256 hello, uint8 goodbye){
    return (5, 5);
  }

  function returnsStaticArray () view returns (uint[2]){
    uint[2] arr;
    arr[0] = 5;
    arr[1] = 5;
    return arr;
  }

  function() payable {
    fallbackTriggered = true;
  }
}
