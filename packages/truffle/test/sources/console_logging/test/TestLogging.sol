pragma solidity >=0.4.21 <0.8.0;

import "truffle/Console.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/MyDapp.sol";

contract TestLogging {
  function testLogging() public {
    MyDapp myDapp = MyDapp(DeployedAddresses.MyDapp());

    Console.log(myDapp.myBool());
    Console.log("here is my boolean -- ", myDapp.myBool());

    Console.log(myDapp.myInt());
    Console.log("here is my integer -- ", myDapp.myInt());

    Console.log(myDapp.myUint());
    Console.log("here is my uint -- ", myDapp.myUint());

    Console.log(myDapp.myString());
    Console.log("here is my string -- ", myDapp.myString());

    Console.log(myDapp.myBytes32());
    Console.log("here is my bytes32 -- ", myDapp.myBytes32());

    Console.log(myDapp.myAddress());
    Console.log("here is my address -- ", myDapp.myAddress());
  }
}
