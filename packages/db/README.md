# `@truffle/db`

### Truffle DB is a complete, flexible system for the querying and mutation
### of Truffle’s smart contract records. Following the data model available
### [here](https://trufflesuite.github.io/artifact-updates/data-model.html),
### Truffle DB persists smart contract information that is typically found in
### a project's artifacts, and allows for querying this data using `GraphQL`.

Truffle artifacts are currently stored as JSON files in a project’s `build/contracts/`
directory. These documents are currently the canonical source of information about
a project’s smart contracts. While useful, artifacts can be limited for certain advanced
use cases.

For example, the artifacts format expects contracts with unique names.
This means that currently a developer is unable to keep two contracts in their project
that have the same name. Truffle DB solves this problem with a name record-keeping
system that can keep track of multiple contracts in this situation.## Built With

## Built With

Truffle DB is built with:
- TypeScript
- GraphQL
- Apollo
- PouchDB


## Configuration to enable Truffle DB

Add the following to your `truffle-config.js` file in order to enable Truffle DB
(enabling Truffle DB does not affect Artifacts, but will produce a new `.db`
directory when you compile or migrate your project)

```
db: {
	enabled: true
}
```

## Loading Project Data

If your `truffle-config.js` file is configured to enable the db, running
`truffle compile` and `truffle migrate` will load the necessary db data
Into the `.db` directory. ## Accessing DB Data

To access Truffle DB, run the following command from the root of your project:
`truffle db serve`. This will spin up a Playground instance at
http://localhost:4444/  where you can run queries and mutations against your data## Sample queries and mutationsA variety of queries and mutations are possible using the data stored in Truffle DB. A look at the [data model](https://trufflesuite.github.io/artifact-updates/data-model.html)
as well as the `docs` tab in the Playground page can provide some guidance.To get started, you might want to query for all networks on which your project has been deployed:

```
query getAllNetworks {
 networks {
    	id
  	networkId
        historicBlock {
		height
  		hash
	}
 }
}
```

Perhaps you wish to manually add a network to Truffle DB from a previous deployment:

```
mutation AddNetworks(
  $networkId: NetworkId!
  $height: Int!
  $hash: String!
  $name: String!
) {
	networksAdd(
    input: {
			networks: [
        {
          name: $name
          networkId: $networkId
          historicBlock: {
						height: $height
            hash: $hash
          }
        }
      ]
    }
  ) {
    networks {
      networkId
      id
    }
  }
}
```

For more information on building GraphQL queries, please see their
[documentation](https://graphql.org/).

## Usage

```
const { connect } = require('@truffle/db');

```

## License

MIT
