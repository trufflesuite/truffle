Good news for all you TypeScript lovers, Truffle tests now support TypeScript!

All you have to do is add the following require to your truffle config and you should be good to go!

```javascript
require("ts-node/register");

module.exports = {
  // rest of truffle config
  // ...
```
