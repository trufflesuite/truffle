# @truffle/contract

Better Ethereum contract abstraction, for Node and the browser.

### Install

```
$ npm install @truffle/contract
```

### Features

- Synchronized transactions for better control flow (i.e., transactions won't finish until you're guaranteed they've been mined).
- Promises. No more callback hell. Works well with `ES6` and `async/await`.
- Default values for transactions, like `from` address or `gas`.
- Returning logs, transaction receipt and transaction hash of every synchronized transaction.

### Usage

First, set up a new web3 provider instance and initialize your contract, then `require("@truffle/contract")`.
The contract-schema matches the output of the [@truffle/artifactor](https://github.com/trufflesuite/truffle/tree/master/packages/artifactor), so you can pass in the artifact file Truffle produces and stores in the artifact file when you run `truffle compile`.

```javascript
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const contractArtifact = require("./path/to/contractArtifact.json"); //produced by Truffle compile
const contract = require("@truffle/contract");

const MyContract = contract(contractArtifact);
```

If you aren't using Truffle artifacts, the input to the `contract` function is a JSON blob defined by [@truffle/contract-schema](https://github.com/trufflesuite/truffle/tree/master/packages/contract-schema). This JSON blob is structured in a way that can be passed to all Truffle-related projects.
Minimally, it requires the contract ABI, but passing this alone may cause issues using certain features of Truffle contract.

```javascript
const MyContract = contract({
  abi: [...], // minimum required
  address: "0x...", // optional
  // many more
});
MyContract.setProvider(provider);
```

You now have access to the following functions on `MyContract`, as well as many others:

- `at()`: Create an instance of `MyContract` that represents your contract at a specific address.
- `deployed()`: Create an instance of `MyContract` that represents the default address managed by `MyContract`.
- `new()`: Deploy a new version of this contract to the network, getting an instance of `MyContract` that represents the newly deployed instance.

Each instance is tied to a specific address on the Ethereum network, and each instance has a 1-to-1 mapping from Javascript functions to contract functions. For instance, if your Solidity contract had a function defined `someFunction(uint value) {}` (solidity), then you could execute that function on the network like so:

```javascript
const instance = await MyContract.deployed();
const result = await instance.someFunction(5);
// Do something with the result or continue with more transactions.
```

### Browser Usage

In your `head` element, include @truffle/contract:

```
<script type="text/javascript" src="./dist/truffle-contract.min.js"></script>
```

Alternatively, you can use the non-minified versions for easier debugging.

With this usage, `@truffle/contract` will be available via the `TruffleContract` object:

```
const MyContract = TruffleContract(...);
```

**Note**: Web3 and its dependencies are now bundled into @truffle/contract
v4.0.2 or higher.

### Full Example

Let's use `@truffle/contract` with an example contract from [Dapps For Beginners](https://dappsforbeginners.wordpress.com/tutorials/your-first-dapp/). In this case, the abstraction has been saved to a `.sol` file by [@truffle/artifactor](https://github.com/trufflesuite/truffle/tree/master/packages/artifactor):

```javascript
const contract = require("@truffle/contract");
// Require the package that was previosly saved by @truffle/artifactor
const metacoinArtifact = require("./path/to/MetaCoin.json");
const MetaCoin = contract(metacoinArtifact);

// Remember to set the Web3 provider (see above).
MetaCoin.setProvider(provider);

// In this scenario, two users will send MetaCoin back and forth, showing
// how @truffle/contract allows for easy control flow.
const accountOne = "5b42bd01ff...";
const accountTwo = "e1fd0d4a52...";

// Note our MetaCoin contract exists at a specific address.
const contractAddress = "8e2e2cf785...";

const instance = await MetaCoin.at(contractAddress);

try {
  // Make a transaction that calls the function `sendCoin`, sending 3 MetaCoin
  // to the account listed as accountTwo.
  let result = await instance.sendCoin(accountTwo, 3, { from: accountOne });
  // This code block will not be executed until @truffle/contract has verified
  // the transaction has been processed and it is included in a mined block.
  // @truffle/contract will error if the transaction hasn't been processed in 120 seconds.

  // Since we're using promises, we can return a promise for a call that will
  // check account two's balance.
  let balancerOfAccountTwo = await instance.balances.call(accountTwo);
  console.log("Balance of account two is " + balancerOfAccountTwo + "!"); // => 3

  // But maybe too much was sent. Let's send some back.
  // Like before, will create a transaction that returns a promise, where
  // the callback won't be executed until the transaction has been processed.
  result = await instance.sendCoin(accountOne, 1.5, { from: accountTwo });
  balancerOfAccountTwo = await instance.balances.call(accountTwo);
  console.log("Balance of account two is " + balancerOfAccountTwo + "!"); // => 1.5
} catch (err) {
  // Easily catch all errors along the whole execution.
  console.log("ERROR! " + err.message);
}
```

# API

There are two API's you'll need to be aware of. One is the static Contract Abstraction API and the other is the Contract Instance API. The Abstraction API is a set of functions that exist for all contract abstractions, and those functions exist on the abstraction itself (i.e., `MyContract.at()`). In contrast, the Instance API is the API available to contract instances -- i.e., abstractions that represent a specific contract on the network -- and that API is created dynamically based on functions available in your Solidity source file.

### Contract Abstraction API

Each contract abstraction -- `MyContract` in the examples above -- have the following useful functions:

#### `MyContract.new([arg1, arg2, ...], [tx params])`

This function take whatever constructor parameters your contract requires and deploys a new instance of the contract to the network. There's an optional last argument which you can use to pass transaction parameters including the transaction from address, gas limit and gas price. This function returns a Promise that resolves into a new instance of the contract abstraction at the newly deployed address.

#### `MyContract.at(address)`

This function creates a new instance of the contract abstraction representing the contract at the passed in address. Returns a "thenable" object (not yet an actual Promise for backward compatibility). Resolves to a contract abstraction instance after ensuring code exists at the specified address.

#### `MyContract.deployed()`

Creates an instance of the contract abstraction representing the contract at its deployed address. The deployed address is a special value given to @truffle/contract that, when set, saves the address internally so that the deployed address can be inferred from the given Ethereum network being used. This allows you to write code referring to a specific deployed contract without having to manage those addresses yourself. Like `at()`, `deployed()` is thenable, and will resolve to a contract abstraction instance representing the deployed contract after ensuring that code exists at that location and that that address exists on the network being used.

#### `MyContract.transactionHash`

This property accesses the hash of the transaction in which the contract was deployed. This field gets populated for contract objects created with `.deployed()` or `.new()` but not with `.at()`.

#### `MyContract.link(instance)`

Link a library represented by a contract abstraction instance to MyContract. The library must first be deployed and have its deployed address set. The name and deployed address will be inferred from the contract abstraction instance. When this form of `MyContract.link()` is used, MyContract will consume all of the linked library's events and will be able to report that those events occurred during the result of a transaction.

Libraries can be linked multiple times and will overwrite their previous linkage.

Note: This method has two other forms, but this form is recommended.

#### `MyContract.link(name, address)`

Link a library with a specific name and address to MyContract. The library's events will not be consumed using this form.

#### `MyContract.link(object)`

Link multiple libraries denoted by an Object to MyContract. The keys must be strings representing the library names and the values must be strings representing the addresses. Like above, libraries' events will not be consumed using this form.

#### `MyContract.networks()`

View a list of network ids this contract abstraction has been set up to represent.

#### `MyContract.setProvider(provider)`

Sets the web3 provider this contract abstraction will use to make transactions.

#### `MyContract.setNetwork(network_id)`

Sets the network that MyContract is currently representing.

#### `MyContract.hasNetwork(network_id)`

Returns a boolean denoting whether or not this contract abstraction is set up to represent a specific network.

#### `MyContract.defaults([new_defaults])`

Get's and optionally sets transaction defaults for all instances created from this abstraction. If called without any parameters it will simply return an Object representing current defaults. If an Object is passed, this will set new defaults. Example default transaction values that can be set are:

```javascript
MyContract.defaults({
  from: ...,
  gas: ...,
  gasPrice: ...,
  value: ...
})
```

Setting a default `from` address, for instance, is useful when you have a contract abstraction you intend to represent one user (i.e., one address).

#### `MyContract.clone(network_id)`

Clone a contract abstraction to get another object that manages the same contract artifacts, but using a different `network_id`. This is useful if you'd like to manage the same contract but on a different network. When using this function, don't forget to set the correct provider afterward.

```javascript
const MyOtherContract = MyContract.clone(1337);
```

#### `MyContract.numberFormat = number_type`

You can set this property to choose the number format that abstraction methods return. The default behavior is to return BN.

```javascript
// Choices are:  `["BigNumber", "BN", "String", "BigInt"].
const Example = artifacts.require("Example");
Example.numberFormat = "BigNumber";
```

#### `MyContract.timeout(block_timeout)`

This method allows you to set the block timeout for transactions. Contract instances created from this abstraction will have the specified transaction block timeout. This means that if a transaction does not immediately get mined, it will retry for the specified number of blocks.

#### `MyContract.autoGas = <boolean>`

If this is set to true, instances created from this abstraction will use `web3.eth.estimateGas` and then apply a gas multiplier to determine the amount of gas to include with the transaction. The default value for this is `true`. See [gasMultiplier](/docs/truffle/reference/contract-abstractions#-code-mycontract-gasmultiplier-gas_multiplier-code-).

#### `MyContract.gasMultiplier(gas_multiplier)`

This is the value used when `autoGas` is enabled to determine the amount of gas to include with transactions. The gas is computed by using `web3.eth.estimateGas` and multiplying it by the gas multiplier. The default value is `1.25`.

### Contract Instance API

Each contract instance is different based on the source Solidity contract, and the API is created dynamically. For the purposes of this documentation, let's use the following Solidity source code below:

```javascript
contract MyContract {
  uint public value;
  event ValueSet(uint val);
  function setValue(uint val) {
    value = val;
    emit ValueSet(value);
  }
  function getValue() view returns (uint) {
    return value;
  }
}
```

From JavaScript's point of view, this contract has three functions: `setValue`, `getValue` and `value`. This is because `value` is public and automatically creates a getter function for it.

#### Making a transaction via a contract function

When we call `setValue()`, this creates a transaction. From JavaScript:

```javascript
const result = instance.setValue(5);
console.log("Value was set to", result.logs[0].args.val);
```

The result object that gets returned looks like this:

```javascript
{
  tx: "0x6cb0bbb6466b342ed7bc4a9816f1da8b92db1ccf197c3f91914fc2c721072ebd",
  receipt: {
    // The return value from web3.eth.getTransactionReceipt(hash)
    // See https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethgettransactionreceipt
  },
  logs: [
    {
      address: "0x13274fe19c0178208bcbee397af8167a7be27f6f",
      args: {
        val: BigNumber(5),
      },
      blockHash: "0x2f0700b5d039c6ea7cdcca4309a175f97826322beb49aca891bf6ea82ce019e6",
      blockNumber: 40,
      event: "ValueSet",
      logIndex: 0,
      transactionHash: "0x6cb0bbb6466b342ed7bc4a9816f1da8b92db1ccf197c3f91914fc2c721072ebd",
      transactionIndex: 0,
      type:"mined",
    },
  ],
}
```

Note that if the function being executed in the transaction has a return value, you will not get that
return value inside this result. You must instead use an event (like `ValueSet`) and look up the result
in the `logs` array.

#### Explicitly making a call instead of a transaction

We can call `setValue()` without creating a transaction by explicitly using `.call`:

```javascript
const result = await instance.setValue.call(5);
```

This isn't very useful in this case, since `setValue()` sets things, and the value we pass won't be saved since we're not creating a transaction.

#### Calling getters

However, we can _get_ the value using `getValue()`, using `.call()`. Calls are always free and don't cost any Ether, so they're good for calling functions that read data off the blockchain:

```javascript
const val = instance.getValue.call();
// val represents the `value` storage object in the solidity contract
// since the contract returns that value.
```

Even more helpful, however is we _don't even need_ to use `.call` when a function is marked as `view` or `pure`, because `@truffle/contract` will automatically know that that function can only be interacted with via a call:

```javascript
const val = instance.getValue();
// val reprsents the `value` storage object in the solidity contract
// since the contract returns that value.
```

#### Overloaded functions

Solidity supports a contract having multiple functions with the same name as long as the
function argument types differ. And so you may find yourself in the situation of having a
Truffle contract object with this property.
You can invoke these "overloaded" functions just like you would a normal contract function. Truffle contract instances
actually wrap web3's contract abstraction (`web3.eth.Contract`) and when you call an overloaded function, it
uses the same function resolution that web3 uses. However, we must give a warning that this overloaded function
resolution is often imprecise and can resolve to the wrong function when you call it.

Consider the following contrived code sample:

```solidity
contract MyContract {
  uint256 public myUint;
  string public myString;
  string public myOtherString;

  function setValues(uint256 val, string str) {
    myUint = val;
    myString = str
  }

  function setValues(string str, string otherStr) {
    myString = str;
    myOtherString = otherStr;
  }

  function setValues(uint256 val, string str, string otherStr) {
    myUint = val;
    myString = str;
    myOtherString = otherStr;
  }
}
```

This Solidity contract contains three functions named `setValues`, each taking a different type of input. In your JavaScript you
might do something like the following:

```javascript
await instance.setValue(
  666,
  "this is not string cheese",
  "this is string cheese"
);
```

As mentioned above, Truffle contract wraps web3 `Contract` objects and uses web3's overloaded function resolution.
To resolve these functions, web3's strategy is to look at the number of arguments that the function was invoked with and try
one that takes that many arguments. This works for some cases but is not ideal in that it
can invoke the incorrect function. Take, for example, the case where we do something like the following:

```javascript
await instance.setValue("this is not string cheese", "this is string cheese");
```

We know that in our contract there are two functions named `setValues` that take
two arguments. In the above case, we cannot be sure whether web3's resolution will resolve to the first or second
function. The more precise way to reference functions like this is to use
the `methods` property on the contract instance. The following is an example of how you
access these methods:

```javascript
await instance.methods["setValue(string,string)"](
  "this is not string cheese",
  "this is string cheese"
);
```

The `methods` property is an object whose keys are strings that correspond to the contract function's names
and signatures with no spaces. The values are the functions themselves. You can inspect the
`methods` property to see the key names in this object and match the function signature.
We recommend using this method of calling overloaded functions since it will unambiguously resolve to the correct function.

#### Processing transaction results

When you make a transaction, you're given a `result` object that gives you a wealth of information about the transaction. You're given the transaction hash (`result.tx`), the decoded events (also known as logs; `result.logs`), and a transaction receipt (`result.receipt`). In the below example, you'll receive the `ValueSet()` event because you triggered the event using the `setValue()` function:

```javascript
const result = await instance.setValue(5);
// result.tx => transaction hash, string
// result.logs => array of trigger events (1 item in this case)
// result.receipt => receipt object
```

#### Sending Ether / Triggering the fallback function

You can trigger the fallback function by sending a transaction to this function:

```javascript
// Same result object as above.
const result = await instance.sendTransaction({...})
```

This is promisified like all available contract instance functions, and has the same API as `web3.eth.sendTransaction` without the callback. The `to` value will be automatically filled in for you.

If you only want to send Ether to the contract a shorthand is available:

```javascript
// Same result object as above.
const result = await instance.send(web3.toWei(1, "ether"));
```

#### Estimating gas usage

Run this function to estimate the gas usage:

```javascript
//estimated gas for this transaction
const result = await instance.setValue.estimateGas(5);
```

# Testing

This package is the result of breaking up EtherPudding into multiple modules. Tests currently reside within [@truffle/artifactor](https://github.com/trufflesuite/truffle/tree/master/packages/artifactor) but will soon move here.
