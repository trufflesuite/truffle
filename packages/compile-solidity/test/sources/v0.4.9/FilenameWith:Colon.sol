//SPDX-License-Identifier: MIT
//I've put a colon in the filename to be extra-sure
//that this is indeed testing what it's supposed to
//(that colons in file paths don't screw things up;
//"project:/" should suffice to trigger the issue but
//I want to be extra sure
pragma solidity >=0.4.9 <0.4.20;

contract SimpleContract {
  uint x;

  function SimpleContract() public {
    x = 7;
  }
}
