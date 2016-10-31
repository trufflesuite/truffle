# Background

The standard method of interacting with the Ethereum network is through the [Web3](https://github.com/ethereum/web3.js) library, created by the Ethereum foundation. Although this library is very useful, its current contract abstraction makes interacting with contracts difficult, especially for those new to Ethereum development. To smooth the learning curve, Truffle uses the [Ether Pudding](https://github.com/ConsenSys/ether-pudding) library, built on top of Web3, which aims to make interacting with contracts much easier.

# Reading & Writing Data

The Ethereum network makes a distinction between writing data to the network and reading data from it, and this distinction plays a significant part in how you write your application. In general, writing data is called a **transaction** whereas reading data is called a **call**. Transactions and calls are treated very differently, and have the following characteristics:

### Transactions

Transactions fundamentally change the state of the network. A transaction can be as simple as sending Ether to another account, or as complicated as executing a contract function or adding a new contract to the network. The defining characteristic of a transaction is that it writes (or changes) data. Transactions cost Ether to run, known as "gas", and transactions take time to process. When you execute a contract's function via a transaction, you cannot receive that function's return value because the transaction isn't processed immediately. In general, functions meant to be executed via a transaction will not return a value; they will return a transaction id instead. So in summary, transactions:

* Cost gas (Ether)
* Change the state of the network
* Aren't processed immediately
* Won't expose a return value (only a transaction id).

### Calls

Calls, on the other hand, are very different. Calls can be used to execute code on the network, though no data will be permanently changed. Calls are free to run, and their defining characteristic is that they read data. When you execute a contract function via a call you will receive the return value immediately. In summary, calls:

* Are free (do not cost gas)
* Do not change the state of the network
* Are processed immediately
* Will expose a return value (hooray!)

Choosing between a transaction and a call is as simple as deciding whether you want to read data, or write it.

# Abstraction

In order to appreciate the usefulness of a contract abstraction, we first need a contract to talk about. We'll use the MetaCoin contract provided for you by default.

```javascript
import "ConvertLib.sol";

contract MetaCoin {
  mapping (address => uint) balances;

	event Transfer(address indexed _from, address indexed _to, uint256 _value);

	function MetaCoin() {
		balances[tx.origin] = 10000;
	}

	function sendCoin(address receiver, uint amount) returns(bool sufficient) {
		if (balances[msg.sender] < amount) return false;
		balances[msg.sender] -= amount;
		balances[receiver] += amount;
		Transfer(msg.sender, receiver, amount);
		return true;
	}
	function getBalanceInEth(address addr) returns(uint){
		return ConvertLib.convert(getBalance(addr),2);
	}
	function getBalance(address addr) returns(uint) {
		return balances[addr];
	}
}
```

This contract has three methods aside from the constructor (`sendCoin`, `getBalanceInEth`, and `getBalance`). All three methods can be executed as either a transaction or a call.

Now let's look at the Javascript object called `MetaCoin` provided for us by Truffle and Ether Pudding, made available within our frontend:

```javascript
// Print the deployed version of MetaCoin
console.log(MetaCoin.deployed());

// outputs:
//
// Contract
// - address: "0xa9f441a487754e6b27ba044a5a8eb2eec77f6b92"
// - allEvents: ()
// - getBalance: ()
// - getBalanceInEth: ()
// - sendCoin: ()
```

Notice that the abstraction contains the exact same functions that exist within our contract. It also contains an address which points to the deployed version of the MetaCoin contract.

### Executing Contract Functions

Using the abstraction you can easily execute contract functions on the Ethereum network.

##### Making a Transaction

There are three functions on the MetaCoin contract that we can execute. If you analyze each of them, you'll see that `sendCoin` is the only function that aims to make changes to the network. The goal of `sendCoin` is to "send" some Meta coins from one account to the next, and these changes should persist.

When calling `sendCoin`, we'll execute it as a transaction. In the following example, we'll send 10 Meta coin from one account to another, in a way that persists changes on the network:

```javascript
var account_one = "0x1234..."; // an address
var account_two = "0xabcd..."; // another address

var meta = MetaCoin.deployed();
meta.sendCoin(account_two, 10, {from: account_one}).then(function(tx_id) {
  // If this callback is called, the transaction was successfully processed.
  // Note that Ether Pudding takes care of watching the network and triggering
  // this callback.
  alert("Transaction successful!")
}).catch(function(e) {
  // There was an error! Handle it.
})
```

There are a few things interesting about the above code:

* We called the abstraction's `sendCoin` function directly. This will result in a transaction by default (i.e, writing data) instead of call.
* When the transaction is successful, the callback function isn't fired until the transaction is processed. This makes life easy and means you don't have to check the status of the transaction yourself.
* We passed an object as the third parameter to `sendCoin`. Note that the `sendCoin` function in our Solidity contract doesn't have a third parameter. What you see above is a special object that can always be passed as the last parameter to a function that lets you edit specific details about the transaction. Here, we set the `from` address ensuring this transaction came from `account_one`.


##### Making a Call

Continuing with MetaCoin, notice the `getBalance` function is a great candidate for reading data from the network. It doesn't need to make any changes, as it just returns the MetaCoin balance of the address passed to it. Let's give it a shot:

```javascript
var account_one = "0x1234..."; // an address

var meta = MetaCoin.deployed();
meta.getBalance.call(account_one, {from: account_one}).then(function(balance) {
  // If this callback is called, the call was successfully executed.
  // Note that this returns immediately without any waiting.
  // Let's print the return value.
  console.log(balance.toNumber());
}).catch(function(e) {
  // There was an error! Handle it.
})
```

What's interesting here:

* We had to execute the `.call()` function explicitly to let the Ethereum network know we're not intending to persist any changes.
* We received a return value instead of a transaction id on success. Note that since the Etheruem network can handle very large numbers, we're given a [BigNumber](https://github.com/MikeMcl/bignumber.js/) object which we then convert to a number.

**Warning:** We convert the return value to a number because in this example the numbers are small. However, if you try to convert a BigNumber that's larger than the largest integer supported by Javascript, you'll likely run into errors or unexpected behavior.


##### Catching Events

Your contracts can fire events that you can catch to gain more insight into what your contracts are doing. The event API is the same as Web3; along with the example below, see the [Web3 documentation](https://github.com/ethereum/wiki/wiki/JavaScript-API#contract-events) for more information.

```javascript
var meta = MetaCoin.deployed();
var transfers = meta.Transfer({fromBlock: "latest"});
transfers.watch(function(error, result) {
  // This will catch all Transfer events, regardless of how they originated.
  if (error == null) {
    console.log(result.args);
  }
}
```

### Method: deployed()

Each contract abstraction has a method called `deployed()`, which you saw used above. Calling this function on the main contract object will give you an instance of the abstraction that represents the contract previously deployed to the network.

```javascript
var meta = MetaCoin.deployed();
```

**Warning:** This will only work successfully for contracts that have been deployed using `truffle migrate` and are set to be deployed within your [project configuration](/advanced/configuration). This function will throw an error if your contract does not meet this criteria.

### Method: at()

Similar to `deployed()`, you can get an instance of the abstraction that represents the contract at a specific address. Here, we expect to have an already deployed contract at the address "0x1234...":

```javascript
var meta = MetaCoin.at("0x1234...")
```

**Warning:** This function will *not* error if your address is incorrect or your address points to the wrong contract. Instead, contract functions called on the abstraction instance will fail. Ensure you have the correct address when using `at()`.

### Method: new()

You can use this method to deploy a completely new instance of a contract onto the network. Here's how:

```javascript
MetaCoin.new().then(function(instance) {
  // `instance` is a new instance of the abstraction.
  // If this callback is called, the deployment was successful.
  console.log(instance.address);
}).catch(function(e) {
  // There was an error! Handle it.
});
```

Note that this *is* a transaction and will change the state of the network.

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
