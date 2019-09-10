pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

contract DowngradeTest {

  //structs; enums; contracts; address payable; functions

  struct Pair {
    uint x;
    uint y;
  }

  enum Ternary {
    Yes, No, MaybeSo
  }

  enum PositionOnHill {
    Up, Down, HalfwayUp
  }

  function() external payable {
  }

  function run(Pair memory p, Ternary t, DowngradeTest dt, address payable a) public {
    emit TheWorks(p, t, dt, a);
  }

  event TheWorks(Pair, Ternary, DowngradeTest, address payable);
  
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
}

library DecoyLibrary {
  event EnumSilliness1(uint8, uint8, DowngradeTest.Ternary indexed, DowngradeTest.PositionOnHill indexed);
  event EnumSilliness2(uint8 indexed, uint8 indexed, DowngradeTest.Ternary, DowngradeTest.PositionOnHill);
}
