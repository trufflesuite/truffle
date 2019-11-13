pragma solidity >=0.4.21 <0.6.0;

contract TruffleLogger {
  event __Log(bool boolean);
  event __Log(int num);
  event __Log(uint num);
  event __Log(string str);
  event __Log(bytes32 b32);
  event __Log(address addr);
}
