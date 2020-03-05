pragma solidity ^0.6.3;

contract DecodingSample {
  enum E {
    EnumValZero,
    EnumValOne,
    EnumValTwo,
    EnumValThree,
    EnumValFour
  }

  struct S {
    int     structInt;
    string  structString;
    bool    structBool;
    address structAddress;
    S2      structS2;
  }

  struct S2 {
    uint[2] structTwoFixedArrayUint;
    uint[] structTwoDynamicArrayUint;
  }

  uint    varUint;
  string  varString;
  bool    varBool;
  address varAddress;
  bytes7  varBytes7;
  bytes   varBytes;
  E       varEnum;
  S       varStructS;

  mapping(uint => uint) varMapping;
  mapping(address => uint) varAddressMapping;
  mapping(DecodingSample => uint) varContractMapping;
  mapping(E => uint) varEnumMapping;

  uint[2]    fixedArrayUint;
  string[2]  fixedArrayString;
  bool[2]    fixedArrayBool;
  address[2] fixedArrayAddress;
  bytes7[2]  fixedArrayBytes7;
  byte[2]    fixedArrayByte;
  E[2]       fixedArrayEnum;

  uint[]    dynamicArrayUint;
  string[]  dynamicArrayString;
  bool[]    dynamicArrayBool;
  address[] dynamicArrayAddress;
  bytes7[]  dynamicArrayBytes7;
  byte[]    dynamicArrayByte;
  E[]       dynamicArrayEnum;

  function() external functionExternal = this.example;

  function example() public {
    functionExternal = this.example;
  }

  constructor() public {
    varUint = 1;
    varString = "two";
    varBool = true;
    varAddress = 0x12345567890abcDEffEDcBa09876543211337121;
    varBytes7 = hex"78554477331122";
    varBytes = new bytes(4);
    varBytes[0] = 0x01;
    varBytes[1] = 0x03;
    varBytes[2] = 0x03;
    varBytes[3] = 0x07;
    varEnum = E.EnumValTwo;
    varStructS.structInt = -2;
    varStructS.structString = "three";
    varStructS.structBool = false;
    varStructS.structAddress = 0x54321567890abcdeFfEDcBA09876543211337121;
    varStructS.structS2.structTwoFixedArrayUint[0] = 4;
    varStructS.structS2.structTwoFixedArrayUint[1] = 2;
    varStructS.structS2.structTwoDynamicArrayUint = new uint[](3);
    varStructS.structS2.structTwoDynamicArrayUint[0] = 4;
    varStructS.structS2.structTwoDynamicArrayUint[1] = 8;
    varStructS.structS2.structTwoDynamicArrayUint[2] = 12;

    fixedArrayUint[0] = 0x10;
    fixedArrayUint[1] = 0x11;
    fixedArrayString[0] = "hello";
    fixedArrayString[1] = "world";
    fixedArrayBool[0] = true;
    fixedArrayBool[1] = false;
    fixedArrayAddress[0] = 0x98761567890ABCdeffEdCba09876543211337121;
    fixedArrayAddress[1] = 0xfEDc1567890aBcDeFfEdcba09876543211337121;
    fixedArrayBytes7[0] = hex"75754477331122";
    fixedArrayBytes7[1] = hex"e7d14477331122";
    fixedArrayByte[0] = 0x37;
    fixedArrayByte[1] = 0xbe;
    fixedArrayEnum[0] = E.EnumValFour;
    fixedArrayEnum[1] = E.EnumValTwo;

    dynamicArrayUint = new uint[](2);
    dynamicArrayUint[0] = 0x10;
    dynamicArrayUint[1] = 0x11;
    dynamicArrayString = new string[](2);
    dynamicArrayString[0] = "hello";
    dynamicArrayString[1] = "world";
    dynamicArrayBool = new bool[](2);
    dynamicArrayBool[0] = true;
    dynamicArrayBool[1] = false;
    dynamicArrayAddress = new address[](2);
    dynamicArrayAddress[0] = 0x98761567890ABCdeffEdCba09876543211337121;
    dynamicArrayAddress[1] = 0xfEDc1567890aBcDeFfEdcba09876543211337121;
    dynamicArrayBytes7 = new bytes7[](2);
    dynamicArrayBytes7[0] = hex"75754477331122";
    dynamicArrayBytes7[1] = hex"e7d14477331122";
    dynamicArrayByte = new byte[](2);
    dynamicArrayByte[0] = 0x37;
    dynamicArrayByte[1] = 0xbe;
    dynamicArrayEnum = new E[](2);
    dynamicArrayEnum[0] = E.EnumValFour;
    dynamicArrayEnum[1] = E.EnumValTwo;

    varMapping[2] = 41;
    varMapping[3] = 107;
    varAddressMapping[address(this)] = 683;
    varContractMapping[this] = 2049;
    varEnumMapping[E.EnumValOne] = 1;
    varEnumMapping[E.EnumValTwo] = 2;
    varEnumMapping[E.EnumValThree] = 3;
    varEnumMapping[E.EnumValFour] = 4;
  }
}
