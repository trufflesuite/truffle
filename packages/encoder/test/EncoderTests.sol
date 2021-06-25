pragma solidity ^0.8.9;

enum GlobalColor {
  White, Cyan, Magenta, Blue, Yellow, Green, Red, Black
}

interface TestInterface {
  function doThings(uint) external payable;
}

contract TestContract is TestInterface {
  enum Color {
    Black, Green, Blue, Cyan, Red, Yellow, Magenta, White
  }

  enum MinusColor {
    White, Magenta, Yellow, Red, Cyan, Blue, Green, Black
  }

  enum ShortEnum {
    VeryShort, Short, KindOfShort, NotShort
  }

  struct ByteAndNum {
    bytes1 x;
    uint8 y;
  }

  struct Mimic {
    uint8 length;
  }

  struct NumAndString {
    uint8 x;
    string y;
  }

  struct NumAndBigNum {
    uint8 x;
    uint y;
  }

  struct BigNumAndNum {
    uint x;
    uint8 y;
  }

  struct BigNumAndBigNum {
    uint x;
    uint y;
  }

  type Octet is bytes1;
  type LegacyChar is bytes1;
  type Flag is bool;
  type Ether is fixed;
  type Natural is uint;
  type Account is address;

  function doThings(uint x) external payable {
  }

  constructor(uint x) payable {
  }

  function takesVoid() public payable {
  }

  function takesUint(uint x) public payable {
  }

  function takesInt(int x) public payable {
  }

  function takesUint8(uint8 x) public payable {
  }

  function takesInt8(int8 x) public payable {
  }

  function takesFunction(function() external x) public payable {
  }

  function takesString(string memory x) public payable {
  }
  
  function takesBytes(bytes memory x) public payable {
  }

  function takesBytes32(bytes32 x) public payable {
  }

  function takesBytes1(bytes1 x) public payable {
  }

  function takesBytesOrArray(bytes memory x) public payable {
  }

  function takesBytesOrArray(bytes[][] memory x) public payable {
  }

  function takesAddress(address x) public payable {
  }

  function takesColor(Color x) public payable {
  }

  function takesMinusColor(MinusColor x) public payable {
  }

  function takesForeignColor(AuxContract.Color x) public payable {
  }

  function takesGlobalColor(GlobalColor x) public payable {
  }

  function takesBool(bool x) public payable {
  }

  function takesContract(TestContract x) public payable {
  }

  function takesArray(uint8[] memory x) public payable {
  }

  function takesStaticArray(uint8[2] memory x) public payable {
  }

  function takesStaticStruct(ByteAndNum memory x) public payable {
  }

  function takesStruct(NumAndString memory x) public payable {
  }

  function takesCustom(Octet x) public payable {
  }

  function takesMultiple(uint8 x, uint8 y) public payable {
  }

  function takesMultipleDynamic(uint8 x, string memory y) public payable {
  }

  function overloaded(address x) public payable {
  }

  function overloaded(uint8[] memory x) public payable {
  }

  function overloaded(function() external x) public payable {
  }

  function overloaded() public payable {
  }

  function overloaded(ByteAndNum memory x) public payable {
  }

  function overloaded(Mimic memory x) public payable {
  }

  function overloaded(bytes32 x) public payable {
  }

  function overloaded(Octet x) public payable {
  }

  function overloaded(uint x) public payable {
  }

  function overloaded(Color x) public payable {
  }

  function overloaded(string memory x) public payable {
  }

  function overloaded(bool x) public payable {
  }

  function overloadedUint8ArrayInput(bytes memory x) public payable {
  }

  function overloadedUint8ArrayInput(Mimic memory x) public payable {
  }

  function overloadedArray(uint[] memory x) public payable {
  }

  function overloadedArray(uint[2] memory x) public payable {
  }

  function overloadedArray(uint8[] memory x) public payable {
  }

  function overloadedStruct(NumAndBigNum memory x) public payable {
  }

  function overloadedStruct(BigNumAndNum memory x) public payable {
  }

  function overloadedStruct(BigNumAndBigNum memory x) public payable {
  }

  function overloadedMulti(uint8 x, uint y) public payable {
  }

  function overloadedMulti(uint x, uint8 y) public payable {
  }

  function overloadedMulti(uint x, uint y) public payable {
  }

  function overloadedBytes(bytes1 x) public payable {
  }

  function overloadedBytes(bytes4 x) public payable {
  }

  function overloadedBytes(bytes memory x) public payable {
  }

  function overloadedNumeric(uint8 x) public payable {
  }

  function overloadedNumeric(int8 x) public payable {
  }

  function overloadedNumeric(int16 x) public payable {
  }

  function overloadedAmbiguous() public payable {
  }

  function overloadedAmbiguous(uint x) public payable {
  }

  function overloadedAmbiguous(ByteAndNum memory x) public payable {
  }

  function overloadedUnambiguous() public payable {
  }

  function overloadedUnambiguous(ByteAndNum memory x) public payable {
  }
}

contract AuxContract {
  enum Color {
    Black, Red, Green, Yellow, Blue, Magenta, Cyan, White
  }
}
