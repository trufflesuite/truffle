contract Example {
  uint public value;
  function Example() {
    value = 1;
  }
  function setValue(uint val) {
    value = val;
  }
  function getValue() constant returns(uint) {
    return value;
  }
  event ExampleEvent(address indexed _from);

}
