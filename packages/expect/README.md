# @truffle/expect
Simple module for ensuring expected parameters exist

### install

```
$ npm install @truffle/expect
```

### Usage

```javascript
const expect = require("@truffle/expect");

// the object you're testing
const options = {
  example: "exists",
  another: 5
};

expect.options(options, ["example", "another"]); // does nothing because both key values exist
expect.options(options, ["example", "another", "some_other_key"]); // errors because options["some_other_key"] is undefined

expect.one(options, ["example", "optional_key"]); // does nothing because at least one key value exists
expect.one(options, ["optional_key", "other_optional_key"]); // errors because both key values are undefined
```
