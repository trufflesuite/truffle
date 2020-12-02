# `@truffle/db`

Truffle DB is a complete, flexible system for the querying and mutation
of Truffle’s smart contract records. Following the data model available [here](https://trufflesuite.github.io/artifact-updates/data-model.html),
Truffle DB persists smart contract information that is typically found in
a project's artifacts, and allows for querying this data using `GraphQL`.

</br>

Truffle artifacts are currently stored as JSON files in a project’s `build/contracts/`
directory. These documents are currently the canonical source of information about
a project’s smart contracts. While useful, artifacts can be limited for certain advanced
use cases.

</br>

For example, the artifacts format expects contracts with unique names.
This means that currently a developer is unable to keep two contracts in their project
that have the same name. Truffle DB solves this problem with a name record-keeping
system that can keep track of multiple contracts in this situation.

## Built With

Truffle DB is built with:
- TypeScript
- GraphQL
- Apollo
- PouchDB

## Configuration to enable Truffle DB

Add the following to your `truffle-config.js` file in order to enable Truffle DB

```
db: {
  enabled: true
}
```
Note: Enabling Truffle DB does not affect artifacts, but will produce a new `.db`
directory when you compile or migrate your project.


It will soon be possible to load and access Truffle DB data via `truffle compile` and `truffle migrate`.
Stay tuned!

## Usage

```
const { connect } = require("@truffle/db")

```

## License

MIT
