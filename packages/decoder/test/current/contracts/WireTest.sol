//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
pragma experimental ABIEncoderV2;

contract WireTestParent {

  event Done();

  function inherited(uint[2] memory) public {
    emit Done();
  }

  //no constructor

  function inheritedReturn() public pure returns (uint) {
    return 1;
  }
}

abstract contract WireTestAbstract {
  event AbstractEvent();

  function danger() public virtual;

  function overriddenReturn() public pure virtual returns (uint);
}

struct GlobalStruct {
  uint x;
  uint y;
}

enum GlobalEnum {
  No, Yes
}

contract WireTest is WireTestParent, WireTestAbstract {

  type MyInt is int8;

  function notImplemented() public {
    emit Done();
  } //just a dummy function, not 

  constructor(bool status, bytes memory info, Ternary whoknows) {
    deepStruct["blornst"].push();
    deepStruct["blornst"].push();
    deepString.push();
    deepString.push();
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

  event EmitStuff(Triple, address[2], string[], MyInt);

  function emitStuff(Triple memory p, address[2] memory precompiles, string[] memory strings, MyInt x) public {
    emit EmitStuff(p, precompiles, strings, x);
  }

  event MoreStuff(WireTest, uint[] data);

  function moreStuff(WireTest notThis, uint[] memory bunchOfInts) public {
    emit MoreStuff(notThis, bunchOfInts);
  }

  event Globals(GlobalStruct, GlobalEnum);

  function globalTest(GlobalStruct memory s, GlobalEnum e) public {
    emit Globals(s, e);
  }

  event Danger(function() external);

  function danger() public override {
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
  event ObviouslyAnon(bytes1) anonymous;

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

  function returnsStuff() public pure returns (Triple memory, Ternary, MyInt) {
    return (
      Triple(
        -1,
        0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef,
        hex"deadbeef"
      ),
      Ternary.No,
      MyInt.wrap(-1)
    );
  }

  function overriddenReturn() public pure override returns (uint) {
    return 2;
  }

  receive() external payable {
  }

  function boom() public returns (uint) {
    selfdestruct(payable(address((this))));
  }

  event SemiAmbiguousEvent(uint indexed, uint);

  function extrasTestSome() public {
    emit SemiAmbiguousEvent(1, 2);
  }

  function extrasTestNone(address test) public returns (bool, bytes memory) {
    return test.delegatecall(
      abi.encodeWithSignature("run()")
    );
  }

  error UnambiguousError(int, int);

  function throwUnambiguous() public pure {
    revert UnambiguousError(-1, -2);
  }

  function callAndThrow() public pure {
    WireTestLibrary.throwUnambiguous();
  }

  error h9316(bytes32); //ambiguous with b2072(uint)

  function throwAmbiguous() public pure {
    revert h9316(hex"");
  }

  function callAndThrowAmbiguous() public pure {
    WireTestLibrary.throwAmbiguous();
  }

  function multicall(bytes[] calldata datas) external {
    for (uint i = 0; i < datas.length; i++) {
      address(this).call(datas[i]);
    }
  }
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

  error LibraryError();

  function throwUnambiguous() external pure {
    revert LibraryError();
  }

  error b27072(uint); //ambiguous with h9316(bytes32)

  function throwAmbiguous() external pure {
    revert b27072(0);
  }
}

contract WireTestRedHerring {
  event SemiAmbiguousEvent(uint, uint indexed);
  event NonAmbiguousEvent();

  function run() public {
    emit NonAmbiguousEvent();
  }
}
