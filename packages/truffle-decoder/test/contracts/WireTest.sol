pragma solidity ^0.5.10;
pragma experimental ABIEncoderV2;

contract WireTest {
  constructor(bool status, bytes memory info, Ternary whoknows) public {
    emit ConstructorEvent(status, info, whoknows);
  }

  event ConstructorEvent(bool, bytes, Ternary);

  struct Triple {
    int x;
    bytes32 y;
    bytes z;
  }

  enum Ternary {
    Yes, No, MaybeSo
  }

  event Danger(function() external);

  function danger() public {
    emit Danger(this.danger);
  }

  event EmitStuff(Triple, address[2], string[]);

  function emitStuff(Triple memory p, address[2] memory precompiles, string[] memory strings) public {
    emit EmitStuff(p, precompiles, strings);
  }

  event MoreStuff(WireTest, uint[]);

  function moreStuff(WireTest notThis, uint[] memory bunchOfInts) public {
    emit MoreStuff(notThis, bunchOfInts);
  }
}

//TODO: add tests of library events & ambiguity
