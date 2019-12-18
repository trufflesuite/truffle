pragma solidity >=0.4.21 <0.6.0;

contract TruffleLogger {
  event _TruffleLog(bool boolean);
  event _TruffleLog(int num);
  event _TruffleLog(uint num);
  event _TruffleLog(string str);
  event _TruffleLog(bytes32 b32);
  event _TruffleLog(address addr);

  function Log(bool x) public {
    emit _TruffleLog(x);
  }

  function Log(int x) public {
    emit _TruffleLog(x);
  }

  function Log(uint x) public {
    emit _TruffleLog(x);
  }

  function Log(string memory x) public {
    emit _TruffleLog(x);
  }

  function Log(bytes32 x) public {
    emit _TruffleLog(x);
  }

  function Log(address x) public {
    emit _TruffleLog(x);
  }
}
