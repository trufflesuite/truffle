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

  function shhImADecimal(int168 secretlyADecimal) public {
    emit SecretlyADecimal(secretlyADecimal);
  }

  event SecretlyADecimal(int168);

  function enumSilliness(uint x, Ternary y, uint z) public {
    emit EnumSilliness(x, y, z);
  }

  event EnumSilliness(uint, Ternary, uint);
}
