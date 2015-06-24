# The Proof is in the Pudding

Ether Pudding (or just “Pudding”) is an extension of [web3’s](https://github.com/ethereum/web3.js/tree/master) contract abstraction that makes life as a Dapp developer a whole lot easier. With Pudding, you can cleanly write distributed Ethereum applications and automated tests with less hassle and more reliability, ensuring that each will run against any (read: every) RPC client. When used with the Consensys [TestRPC](https://github.com/ConsenSys/testrpc), you can develop Dapps faster.

Pudding is intended to be used both within Node and within a browser. Although it’s very little code, it packs a whole lot of punch.  

### Reasons to Use Pudding (short list)
* Transactions can be “synchronized” with the network, so your app/tests won’t receive callbacks until the transactions have been processed. This makes control flow easier to manage.
* Contract functions are “promisified” using bluebird. This makes sequential calls and transactions easier to write.
* Transaction defaults (like a default “from” address) are DRY. You can specify defaults for an individual instance of a contract, for all instances derived from a contract class, or across all Pudding contracts. This makes your code DRY, too.
* With all of the above, developing on Ethereum gets a whole lot easier.    

### Install

**Node**
```
npm install ether-pudding
```

**Browser**
```
<!-- Note: web3 is required. Bluebird is a needed for promises, but not required. -->
<script type="text/javascript" src="./build/ether-pudding.min.js"></script>
```

### Using Pudding

Using Pudding in your app is very similar to using web3’s contract abstraction. In fact, Pudding calls web3’s abstraction under the hood. Like with web3, you need to provide an ABI ([Application Binary Interface](https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI)) object in order to create your contract class. Programs like `solc` -- the Solidity compiler from [cpp-ethereum](https://github.com/ethereum/cpp-ethereum) -- can provide you with an ABI.

```coffeescript
web3 = require "web3"
Pudding = require "ether-pudding"

# Set the provider, as you would normally. 
web3.setProvider(new web3.Providers.HttpProvider("http://localhost:8545"))

# Before performing the next step, you'll need to compile your contract
# and have the ABI available, just as you would with web3.eth.contract().

MyContract = Pudding.recipe(abi) # You need to provide abi
```

So far, Pudding isn’t much different from web3’s contract abstraction. Here’s an example using the MetaCoin contract in [Dapps For Beginners](https://dappsforbeginners.wordpress.com/tutorials/your-first-dapp/):

```coffeescript
MetaCoin = Pudding.recipe(metaCoinABI)

# In this scenario, two users will send MetaCoin back and forth, showing
# how Pudding allows for easy control flow. 
account_one = "5b42bd01ff..."
account_two = "e1fd0d4a52..."

contract_address = "8e2e2cf785..."

coin = MetaCoin.at(contract_address, {gasLimit: 3141592})

coin.sendCoin(account_two, 3, {from: account_one}).then (tx) ->
  # This code block will not be executed until Pudding has verified 
  # the transaction has been processed and it is included in a mined block.
  # Pudding will error if the transaction hasn't been processed in 120 seconds.
  
  # Since we're using promises (and this is coffeescript), we can return a 
  # promise for a call that will check account two's balance.
  coin.balances.call(account_two)
.then (balance_of_account_two) ->
  alert("Balance of account two is #{balance_of_account_two}!") # => 3
  
  # But maybe too much was sent. Let's send some back.
  # Like before, will create a transaction that returns a promise, where
  # the callback won't be executed until the transaction has been processed.
  coin.sendCoin(account_one, 1.5, {from: account_two})
.then (tx) ->
  # Again, get the balance of account two
  coin.balances.call(account_two)
.then (balance_of_account_two) ->
  alert("Balance of account two is #{balance_of_account_two}!") # => 1.5
.catch (err) ->
  # Easily catch all errors along the whole execution.
  alert("ERROR! #{err.message}")
```

The above example may not be used within an app (you wouldn’t send the wrong amount on purpose, for example’s sake) -- but you can easily see how it might apply to an automated test.

### More Examples

* [Setting global, contract-level and instance-level defaults](./wiki/Setting-global,-contract-level-and-instance-level-defaults)

### Building

You can create a pure Javascript and minified Javascript version of Pudding by first installing and then running `grunt`. These files will be placed in the `./build` directory.

```
$ npm install -g grunt-cli
$ grunt
```

### License

MIT
