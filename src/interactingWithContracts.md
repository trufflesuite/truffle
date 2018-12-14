### Interacting with Contracts

Thanks to the excellent changes in Web3.js 1.0,
we've implemented the following features.

#### EventEmitter / Promise interface
Contract objects now have an EventEmitter interface and return a promise.  You can now interact with them very much like you would interact with `web3.eth.Contract` objects!

Events also now have an EventEmitter interface.

See the [usage section](https://truffleframework.com/docs/truffle/reference/contract-abstractions#usage) of the Truffle contract abstraction docs for some examples of working with contract objects and events!

#### REVERT Reason strings
Another super useful change is support for revert reason strings!  Now if a transaction needs to be reverted, you will receive the reason string and know why.

#### Confirmation / block wait timeouts config
Previously when a transaction didn't get mined after 50 blocks, the transaction was dropped.  Now Truffle allows you to configure block timeout amounts on your contracts.
So for example, say you wanted your contract's transactions to timeout after 1,000 blocks.
```javascript
Example.timeoutBlocks = 1000; // Set the timeout property on the contract abstraction
const example = await Example.new(1);
await example.setValue(5); // The transaction will retry for 1,000 blocks
```

#### websockets
Truffle now supports a websockets option for networks.  You will need to enable this if you want to use the `confirmations` listener or if you want to hear Events using `.on` or `.once`.
In the Truffle config...
```javascript
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      websockets: true
    }
  }
}
```

#### Automated Fueling
You can choose whether you want to have Truffle compute gas amounts for your transactions.  If `autoGas` is enabled then Truffle will use web3 to estimate the gas.  Then it will multiply it by a multiplier that is set with `gasMultiplier` and include that gas amount with the transaction.
```javascript
Example.autoGas = true;    // Defaults to true
Example.gasMultiplier(1.5) // Defaults to 1.25
const instance = await Example.new();
await instance.callExpensiveMethod();
```

#### Overloaded Solidity functions

#### BigNumber/BN return format (compatibility)

#### Structured function parameters
