#### `await` in the console

The `await` keyword now works in `truffle console` and `truffle develop`!

```javascript
truffle(develop)> let instance = await Example.deployed();
truffle(develop)> await instance.someFunc();
```
