pragma solidity >=0.4.21 <0.8.0;

contract MyDapp {
  bool public myBool = true;
  int public myInt = -4321;
  uint public myUint = 1234;
  string public myString = "myString";
  bytes32 public myBytes32 = bytes32("myBytes32");
  address public myAddress = address(this);
}
