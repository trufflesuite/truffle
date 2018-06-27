contract Example {
  uint public value;
  uint public counter;
  bool public fallbackTriggered;

  event ExampleEvent(address indexed _from, uint num);
  event ContractAddressEvent(address _contract);
  event SpecialEvent();

  function Example(uint val) {
    // Constructor revert
    require(val != 13);

    // Expensive deployment
    if(val >= 50){
      for(uint i = 0; i < val; i++){
        counter = i;
      }
    }

    value = val;
    fallbackTriggered = false;
  }

  function setValue(uint val) {
    value = val;
  }

  function isDeployed() constant returns (address){
    return address(this);
  }

  function viewSender() view returns(address){
    return msg.sender;
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

  function triggerEventWithArgument(uint arg) {
    ExampleEvent(msg.sender, arg);
  }

  function triggerSpecialEvent() {
    SpecialEvent();
  }

  function triggerContractAddressEvent(){
    ContractAddressEvent(address(this));
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

  function isExpensive(uint val){
    for(uint i = 0; i < val; i++){
      counter = i;
    }
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
