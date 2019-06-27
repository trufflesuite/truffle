pragma solidity ^0.5.10;
pragma experimental ABIEncoderV2;

contract WireTestParent {

  event Done();

  function inherited(uint[2] memory) public {
    emit Done();
  }

  //no constructor
}

contract WireTest is WireTestParent {
  constructor(bool status, bytes memory info, Ternary whoknows) public {
    emit ConstructorEvent(status, info, whoknows);
  }

  event ConstructorEvent(bool bit, bytes, Ternary);

  struct Triple {
    int x;
    bytes32 y;
    bytes z;
  }

  enum Ternary {
    Yes, No, MaybeSo
  }

  event Danger(function() external);

  //currently omitted from tests due to having to deal with
  //ethers's crappy decoder
  function danger() public {
    emit Danger(this.danger);
  }

  event EmitStuff(Triple, address[2], string[]);

  function emitStuff(Triple memory p, address[2] memory precompiles, string[] memory strings) public {
    emit EmitStuff(p, precompiles, strings);
  }

  event MoreStuff(WireTest, uint[] data);

  function moreStuff(WireTest notThis, uint[] memory bunchOfInts) public {
    emit MoreStuff(notThis, bunchOfInts);
  }

  event HasIndices(uint, uint indexed, string, string indexed, uint);

  function indexTest(uint a, uint b, string memory c, string memory d, uint e) public {
    emit HasIndices(a, b, c, d, e);
  }
}
