pragma solidity ^0.4.23;

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
    // S2      structS2;
    // mapping(uint => uint) structMappingUints;
    // mapping(string => S2) structMappingS2;
  }

  struct S2 {
    uint[2] structTwoFixedArrayUint;
    uint[] structTwoDynamicArrayUint;
    // mapping(string => mapping(uint => address)) structTwoDoubleMapping;
  }

  event EventNameOne(string argString);
  event EventNameTwo(string argString, uint argUint);

  uint    varUint;
  string  varString;
  bool    varBool;
  address varAddress;
  bytes7  varBytes7;
  bytes   varBytes;
  E       varEnum;
  S       varStructS;

  //mapping(uint => uint) varMapping;

  uint[2]    fixedArrayUint;
  string[2]  fixedArrayString;
  bool[2]    fixedArrayBool;
  address[2] fixedArrayAddress;
  bytes7[2]  fixedArrayBytes7;
  // byte[2]    fixedArrayByte;
  // E[2]       fixedArrayEnum;
  // S[2]       fixedArrayStructS;

  // uint[]    dynamicArrayUint;
  // string[]  dynamicArrayString;
  // bool[]    dynamicArrayBool;
  // address[] dynamicArrayAddress;
  // bytes7[]  dynamicArrayBytes7;
  // byte[]    dynamicArrayByte;
  // E[]       dynamicArrayEnum;
  // S[]       dynamicArrayStructS;

  constructor() public {
    varUint = 1;
    varString = "two";
    varBool = true;
    varAddress = 0x0012345567890abcdeffedcba09876543211337121;
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
    varStructS.structAddress = 0x0054321567890abcdeffedcba09876543211337121;
    // varStructS.structS2.structTwoFixedArrayUint[0] = 4;
    // varStructS.structS2.structTwoFixedArrayUint[1] = 2;
    // varStructS.structS2.structTwoDynamicArrayUint = new uint[](3);
    // varStructS.structS2.structTwoDynamicArrayUint[0] = 4;
    // varStructS.structS2.structTwoDynamicArrayUint[1] = 8;
    // varStructS.structS2.structTwoDynamicArrayUint[2] = 12;

    fixedArrayUint[0] = 0x10;
    fixedArrayUint[1] = 0x11;
    fixedArrayString[0] = "hello";
    fixedArrayString[1] = "world";
    fixedArrayBool[0] = true;
    fixedArrayBool[1] = false;
    fixedArrayAddress[0] = 0x0098761567890abcdeffedcba09876543211337121;
    fixedArrayAddress[1] = 0x00fedc1567890abcdeffedcba09876543211337121;
    fixedArrayBytes7[0] = hex"75754477331122";
    fixedArrayBytes7[1] = hex"e7d14477331122";
    // fixedArrayByte[0] = 0x37;
    // fixedArrayByte[1] = 0xbe;
    // fixedArrayEnum[0] = E.EnumValFour;
    // fixedArrayEnum[1] = E.EnumValTwo;
    // fixedArrayStructS[0].structInt = -134;
    // fixedArrayStructS[0].structString = "explore";
    // fixedArrayStructS[0].structBool = true;
    // fixedArrayStructS[0].structAddress = 0x00a3e11567890abcdeffedcba09876543211337121;
    // fixedArrayStructS[0].structS2.structTwoFixedArrayUint[0] = 9001;
    // fixedArrayStructS[0].structS2.structTwoFixedArrayUint[1] = 30231;
    // fixedArrayStructS[0].structS2.structTwoDynamicArrayUint = new uint[](4);
    // fixedArrayStructS[0].structS2.structTwoDynamicArrayUint[0] = 2;
    // fixedArrayStructS[0].structS2.structTwoDynamicArrayUint[1] = 256;
    // fixedArrayStructS[0].structS2.structTwoDynamicArrayUint[2] = 1023;
    // fixedArrayStructS[0].structS2.structTwoDynamicArrayUint[3] = 5555;
    // fixedArrayStructS[1].structInt = -1343;
    // fixedArrayStructS[1].structString = "exploring";
    // fixedArrayStructS[1].structBool = true;
    // fixedArrayStructS[1].structAddress = 0x00a3e11567890abcdeffedcba09876543211337abc;
    // fixedArrayStructS[1].structS2.structTwoFixedArrayUint[0] = 900103;
    // fixedArrayStructS[1].structS2.structTwoFixedArrayUint[1] = 3023103;
    // fixedArrayStructS[1].structS2.structTwoDynamicArrayUint = new uint[](4);
    // fixedArrayStructS[1].structS2.structTwoDynamicArrayUint[0] = 3;
    // fixedArrayStructS[1].structS2.structTwoDynamicArrayUint[1] = 250;
    // fixedArrayStructS[1].structS2.structTwoDynamicArrayUint[2] = 10123;
    // fixedArrayStructS[1].structS2.structTwoDynamicArrayUint[3] = 68715;
  }
}
