//NOTE: This is just a simple example. If you want to actullay deploy a fully, standards compatible, token/coin onto the Ethereum network (so that it talks as expected to the other contracts), have a look at the code here: https://github.com/ConsenSys/Tokens. It contains up to date token code.
contract MetaCoin {
	mapping (address => uint) balances;

	function MetaCoin() {
		balances[tx.origin] = 10000;
	}

	function sendCoin(address receiver, uint amount) returns(bool sufficient) {
		if (balances[msg.sender] < amount) return false;
		balances[msg.sender] -= amount;
		balances[receiver] += amount;
		return true;
	}

  function getBalance(address addr) returns(uint) {
    return balances[addr];
  }
}
