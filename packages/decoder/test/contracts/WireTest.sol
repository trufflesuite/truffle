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
    deepStruct["blornst"].length = 9;
    deepString.length = 9;
    emit ConstructorEvent(status, info, whoknows);
  }

  event ConstructorEvent(bool bit, bytes, Ternary);

  struct Triple {
    int x;
    bytes32 y;
    bytes z;
  }

  //the point of including this is to test that it doesn't send
  //the allocator into an infinite loop
  struct RedHerring {
    RedHerring[] redHerring;
  }

  //similarly
  function redHerring(RedHerring memory) internal pure {
  }

  enum Ternary {
    Yes, No, MaybeSo
  }

  event EmitStuff(Triple, address[2], string[]);

  function emitStuff(Triple memory p, address[2] memory precompiles, string[] memory strings) public {
    emit EmitStuff(p, precompiles, strings);
  }

  event MoreStuff(WireTest, uint[] data);

  function moreStuff(WireTest notThis, uint[] memory bunchOfInts) public {
    emit MoreStuff(notThis, bunchOfInts);
  }

  event Danger(function() external);

  function danger() public {
    emit Danger(this.danger);
  }

  event HasIndices(uint, uint indexed, string, string indexed, uint);

  function indexTest(uint a, uint b, string memory c, string memory d, uint e) public {
    emit HasIndices(a, b, c, d, e);
  }

  function libraryTest(string memory it) public {
    WireTestLibrary.emitEvent(it);
  }

  event AmbiguousEvent(uint8[] indexed, uint[5]);

  function ambiguityTest() public {
    uint8[] memory short = new uint8[](3);
    uint[5] memory long;
    long[0] = 32;
    long[1] = 3;
    long[2] = short[0] = 17;
    long[3] = short[1] = 18;
    long[4] = short[2] = 19;
    emit AmbiguousEvent(short, long);
  }

  function unambiguityTest() public {
    uint8[] memory empty;
    uint[5] memory tooLong;
    //array length too long
    tooLong[0] = 32;
    tooLong[1] = 1e12; //still small enough for JS :)
    tooLong[2] = 17;
    tooLong[3] = 18;
    tooLong[4] = 19;
    emit AmbiguousEvent(empty, tooLong);

    //bad padding
    uint[5] memory badPadding;
    badPadding[0] = 32;
    badPadding[1] = 3;
    badPadding[2] = 257;
    badPadding[3] = 257;
    badPadding[4] = 257;
    emit AmbiguousEvent(empty, badPadding);

    //decodes, but fails re-encode
    uint[5] memory nonStrict;
    nonStrict[0] = 64;
    nonStrict[1] = 0;
    nonStrict[2] = 2;
    nonStrict[3] = 1;
    nonStrict[4] = 1;
    emit AmbiguousEvent(empty, nonStrict);

    WireTestLibrary.emitUnambiguousEvent();
  }

  event AnonUints(uint indexed, uint indexed, uint indexed, uint indexed) anonymous;
  event NonAnon(uint indexed, uint indexed, uint indexed);
  event ObviouslyAnon(byte) anonymous;

  function anonymousTest() public {
    //first test: unambiguous
    emit AnonUints(257, 1, 1, 1);
    //second test: uint8 (from library) or uint?
    emit AnonUints(1, 2, 3, 4);
    //third test: uint, or not anonymous?
    emit NonAnon(1, 2, 3);
    //fourth test: no selector
    emit ObviouslyAnon(0xfe);
  }

  mapping(string => Triple[]) public deepStruct;
  mapping(string => string)[] public deepString;
}

library WireTestLibrary {
  event LibraryEvent(string);

  function emitEvent(string calldata it) external {
    emit LibraryEvent(it);
  }

  event AmbiguousEvent(uint8[], uint[5] indexed);

  function emitUnambiguousEvent() external {
    uint8[] memory wrongLength = new uint8[](1);
    wrongLength[0] = 107;
    uint[5] memory allZeroes;
    emit AmbiguousEvent(wrongLength, allZeroes);
  }

  event AnonUint8s(uint8 indexed, uint8 indexed, uint8 indexed, uint8 indexed) anonymous;
}
