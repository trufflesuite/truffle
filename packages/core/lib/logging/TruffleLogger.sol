pragma solidity >=0.4.21 <0.6.0;

library TruffleLogger {
  event _TruffleLog(bool boolean);
  event _TruffleLog(int num);
  event _TruffleLog(uint num);
  event _TruffleLog(string str);
  event _TruffleLog(bytes32 b32);
  event _TruffleLog(address addr);

  function log(bool x) public {
    emit _TruffleLog(x);
  }

  function log(int x) public {
    emit _TruffleLog(x);
  }

  function log(uint x) public {
    emit _TruffleLog(x);
  }

  function log(string memory x) public {
    emit _TruffleLog(x);
  }

  function log(bytes32 x) public {
    emit _TruffleLog(x);
  }

  function log(address x) public {
    emit _TruffleLog(x);
  }
}
