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

  function shhImADecimal(int168 secretlyADecimal) public returns (int168) {
    emit Done();
    return secretlyADecimal;
  }

  event Done();

  function enumSilliness(Pair memory x, Ternary y, Pair memory z) public {
    emit EnumSilliness(x, y, z);
  }

  event EnumSilliness(Pair, Ternary, Pair);
}
