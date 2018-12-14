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

#### websockets

#### Automated Fueling

#### Overloaded Solidity functions

#### BigNumber/BN return format (compatibility)

#### Structured function parameters
