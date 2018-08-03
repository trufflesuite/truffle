pragma solidity ^0.4.22;

contract Example {
  bytes32 public hash;
  uint public value;
  uint public counter;
  bool public fallbackTriggered;

  event ExampleEvent(address indexed _from, uint num);
  event ContractAddressEvent(address _contract);
  event SpecialEvent();
  event NumberEvent(int numA, int indexed numB, address addrC, uint numD, uint);

  constructor(uint val) {
    // Constructor revert
    require(val != 13);
    require(val != 2001, 'reasonstring');
    require(val != 20001, 'solidity storage is a fun lesson in endianness');

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

  function overloadedSet(bytes32 h, uint val) {
    hash = h;
    value = val;
  }

  function overloadedSet(bytes32 h, uint val, uint multiplier) {
    hash = h;
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

  function triggerNumberEvent(int a, int b, address c, uint d, uint e){
    NumberEvent(a,b,c,d,e);
  }

  function triggerRequireError() {
    require(false);
  }

  function triggerAssertError() {
    assert(false);
  }

  function triggerRequireWithReasonError(){
    require(false, 'reasonstring');
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

  function returnsNamedTuple () view returns (uint256 hello, string black, uint8 goodbye){
    return (5, 'black', 5);
  }

  function returnsUnnamedTuple() view returns (string, uint, uint[2]){
    uint[2] arr;
    arr[0] = 5;
    arr[1] = 5;
    return ('hello', 5, arr);
  }

  function returnsInt() view returns (int){
    return 5;
  }

  function returnsNamedStaticArray() view returns (uint[2] named ){
    uint[2] arr;
    arr[0] = 5;
    arr[1] = 5;
    return arr;
  }

  function returnsUnnamedStaticArray () view returns (uint[2]){
    uint[2] arr;
    arr[0] = 5;
    arr[1] = 5;
    return arr;
  }

  function() payable {
    fallbackTriggered = true;
  }
}
