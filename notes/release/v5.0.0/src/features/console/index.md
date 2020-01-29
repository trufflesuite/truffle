Truffle v5 includes a couple handy console enhancements.

{"gitdown": "contents", "maxLevel": 5, "rootId": "user-content-what-s-new-in-truffle-v5-truffle-console-truffle-develop"}

#### `await` in the console

The `await` keyword now works in `truffle console` and `truffle develop`!

```javascript
truffle(develop)> let instance = await Example.deployed();
truffle(develop)> await instance.someFunc();
```


#### Configure `truffle develop`

Override the network settings for `truffle develop` and specify any of the
available [ganache-core options](https://github.com/trufflesuite/ganache-core#usage).

```javascript
module.exports = {
  /* ... rest of config */

  networks: {
    /* ... other networks */

    "develop": {
      accounts: 5,
      defaultEtherBalance: 500,
      blockTime: 3
    }
  }
};
```
