contract Example {
  uint public value;
  function Example() {
    value = 1;
  }
  function setValue(uint val) {
    value = val;
  }
  event ExampleEvent(address indexed _from);
}
