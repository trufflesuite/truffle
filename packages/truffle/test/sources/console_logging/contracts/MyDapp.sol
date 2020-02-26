pragma solidity >=0.4.21 <0.6.0;

import "truffle/Console.sol";

contract MyDapp {
  bool myBool = true;
  int myInt = -4321;
  uint myUint = 1234;
  string myString = "myString";
  bytes32 myBytes32 = bytes32("myBytes32");
  address myAddress = address(this);

  function doSomething() public {
    Console.log(myBool);
    Console.log(myInt);
    Console.log(myUint);
    Console.log(myString);
    Console.log(myBytes32);
    Console.log(myAddress);
  }
}
