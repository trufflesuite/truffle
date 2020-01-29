# Schema Description: Truffle Contract Network Instance Object

| type | _object_ |
| ---: | ---- |
| JSON Schema | [network-object.spec.json](spec/network-object.spec.json) |

Contract instances encoded within the contract object schema follow the format
described herein. Each instance ("network object") must include the address for
the contract on the network, as well as may include additional information as
appropriate. This may include a listing of event descriptions according to the
ABI, and links to dependent instances of other contracts (within the same
network).


## Properties

### `address`

| type | _string_ matching pattern `^0x[a-fA-F0-9]{40}$` |
| ---: | ---- |
| ref | [Address](#network-object--address) |
| **required** |

The contract instance's primary identifier on the network. 40 character long
hexadecimal string, prefixed by `0x`.


### `events`

| type | _object_ |
| ---: | ---- |
| default | `{}` |

Listing of events the contract instance may produce, either directly or
indirectly, via dependent, linked instances. Object mapping event hash
identifiers (`0x`-prefixed 64-character hexadecimal strings) to semantically
meaningful descriptions of the event.

#### `events` Properties (key matching `^0x[a-fA-F0-9]{64}$`)

| type | _object_ |
| ---: | ---- |
| ref | [abi.spec.json](spec/abi.spec.json) |

Ethereum Contract JSON ABI item representing an EVM output log event for a
contract. Matches objects with `"type": "event"` in the JSON ABI.



### `links`

| type | _object_ |
| ---: | ---- |
| default | `{}` |

Listing of dependent contract instances and their events. Facilitates the
resolution of link references for a particular contract to instances of other
contracts. Object mapping linked contract names to objects representing an
individual link.

#### `links` Properties (key matching `^[a-zA-Z_][a-zA-Z0-9_]*$`)

| type | _object_ |
| ---: | ---- |

Object representing linked contract instance.

##### Link Object Properties

###### `address`

| type | _string_ matching pattern `^0x[a-fA-F0-9]{40}$` |
| ---: | ---- |
| ref | [Address](#network-object--address) |

The primary locator for the linked contract.

###### `events`

| type | _object_ |
| ---: | ---- |

Listing of events the _linked_ contract instance may produce, either directly or
indirectly, via its own dependent, linked instances. Object mapping event hash
identifiers (`0x`-prefixed 64-character hexadecimal strings) to semantically
meaningful descriptions of the event.





## Definitions

### <a name="network-object--address">Address</a>

| type | _string_ matching pattern `^0x[a-fA-F0-9]{40}$` |
| ---: | ---- |

Primary identifier for an account on an EVM blockchain network. 40 character
long hexadecimal string, prefixed by `0x`.
