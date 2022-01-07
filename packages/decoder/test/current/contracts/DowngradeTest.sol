//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
pragma experimental ABIEncoderV2;

contract DowngradeTestParent {
  event Inherited();
}

contract DowngradeTest is DowngradeTestParent {

  //structs; enums; contracts; address payable; functions

  type MyInt is int16;

  struct Pair {
    uint x;
    MyInt y;
  }

  struct AsymmetricTriple {
    Pair p;
    uint z;
  }

  enum Ternary {
    Yes, No, MaybeSo
  }

  enum PositionOnHill {
    Up, Down, HalfwayUp
  }

  fallback() external {
  }

  function() external doYouSeeMe = this.causeTrouble;

  function() internal canYouReadMe = causeTrouble;

  function run(AsymmetricTriple memory at, Ternary t, DowngradeTest dt, address payable ap) public {
    emit TheWorks(at, t, dt, ap);
  }

  event TheWorks(AsymmetricTriple, Ternary, DowngradeTest, address payable);
  
  function causeTrouble() public {
    emit CauseTrouble(this.causeTrouble);
  }

  event CauseTrouble(function() external);

  function shhImADecimal(int168 secretlyADecimal) public returns (int168) {
    emit Done();
    return secretlyADecimal;
  }

  event Done();

  function enumSilliness(uint8 decoy1, uint8 decoy2, Ternary x, PositionOnHill y) public {
    emit EnumSilliness1(decoy1, decoy2, x, y);
    emit EnumSilliness2(decoy1, decoy2, x, y);
  }

  event EnumSilliness1(uint8 indexed, uint8 indexed, Ternary, PositionOnHill);
  event EnumSilliness2(uint8, uint8, Ternary indexed, PositionOnHill indexed);

  function decoy() public { //here to make the additionalContexts test harder
    DecoyLibrary.decoy();
    emit Done();
  }

  function emitParent() public {
    emit Inherited();
  }

  function returnsStuff() public pure returns (Pair memory, Ternary) {
    return (Pair(107, MyInt.wrap(683)), Ternary.No);
  }

  error CustomError(Pair pair);

  function throwCustom() public pure {
    revert CustomError(Pair(1, MyInt.wrap(2)));
  }

  function simple(uint) public {
    emit Done();
  }
}

library DecoyLibrary {
  event EnumSilliness1(uint8, uint8, DowngradeTest.Ternary indexed, DowngradeTest.PositionOnHill indexed);
  event EnumSilliness2(uint8 indexed, uint8 indexed, DowngradeTest.Ternary, DowngradeTest.PositionOnHill);

  function decoy() external pure {
  }
}
