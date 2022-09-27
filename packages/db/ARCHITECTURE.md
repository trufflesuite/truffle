# @truffle/db architecture

At its surface, @truffle/db manages collections of known resources according
to its [data model](https://trufflesuite.github.io/artifact-updates/data-model.html)
for smart contract development. These resources include smart contracts, their
source code, their deployed instances across various networks, historical
references to those networks, etc. It stores these resources via configurable
persistence adapter and exposes them via GraphQL API.

To do this, @truffle/db comprises a set of definitions that represent this data
model as a series of code concerns, which include information about
resource-specific database indexes, GraphQL type definitions / resolvers,
etc. These definitions hook into @truffle/db's underlying meta framework, which
operates abstractly on definitions for any hypothetical data model.

## Collections of resources

A **resource** is an object in the data model with an ID, similar to
[domain-driven design](https://en.wikipedia.org/wiki/Domain-driven_design)'s
_aggregate root_. Resources comprise nested properties, some of which may be
references to other resources.

Resource IDs are computed based on a defined set of immutable properties for
that resource. This ensures that, given a minimally-complete representation,
it is possible to recreate the actual @truffle/db resource perfectly.

Some resources are named, meaning they define a `name` property. Some resources
may contain a lookup to what resource ID a `name` currently refers.

Most resources are immutable. The only mutable resources are those
that keep track of names.

Resources are queried by ID or by a filter for a specific set of IDs.
Resources are bulk-added (if they're immutable) or bulk-assigned (if they're
mutable). Adding immutable resources is idempotent.

## Persistence

@truffle/db supports persisting to IndexedDB databases, to folders of JSON files,
or to memory. This persistence is currently implemented using
[PouchDB](https://pouchdb.com) as adapter.

Resources are persisted with shallow references only and contain/only contain
minimally-complete representations of their aggregate.

## API

@truffle/db exposes all resources via GraphQL schema, either via in-memory
JS object or run as an Apollo server over HTTP.

## Truffle project integration

@truffle/db exposes a component to adapt its domain-specific data model to
external Truffle interfaces, including compilation results and Truffle contract
artifacts.
