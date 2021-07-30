# `@truffle/db-loader`

A loader for importing Truffle Db that does not throw an error when it is not installed.

## Contents

This package's main export is a method called `getTruffleDb`. To import it, simply
destructure it from the package.

```javascript
const { getTruffleDb } = require("@truffle/db-loader");
```

When you call the method, it will return an instance of Truffle Db
or `null` if the import fails.

```javascript
const Db = getTruffleDb();
if (Db === null) {
  throw new Error("There was an error importing Truffle Db.");
}
```

Note that you will need to do a check for a `null` value if you want to provide handling
for the case where Truffle Db fails to load.

Please see the [README for @truffle/db](https://github.com/trufflesuite/truffle/tree/develop/packages/db#truffledb)
for more information on using Truffle Db.
