# Schema Description: Truffle Contract Object

| type | _object_ |
| ---: | ---- |
| JSON Schema | [contract-object.spec.json](spec/contract-object.spec.json) |


[@truffle/contract](https://github.com/trufflesuite/truffle/tree/develop/packages/contract) uses a
formally specified<sup>[1](#footnote-1)</sup> JSON object format to represent
Ethereum Virtual Machine (EVM) smart contracts. This representation is intended
to facilitate the use of general purpose smart contract abstractions
(such as @truffle/contract) by capturing relevant smart contract information in a
persistent and portable manner.

Objects following this schema represent individual smart contracts as defined
by their name and interface. Each object primarily includes a JSON array
representing the contract's ABI<sup>[2](#footnote-2)</sup>, but extends to
include any and all information related to the contract and its lifecycle(s).
Objects in this schema may represent pre-compiled source code, compilation
annotations such as source mappings, references to specified deployed instances
on multiple networks, and/or links to external contracts.

A full property listing is below. Properties not marked "**required**" are not
necessary to include in valid descriptions of contract objects, but functionally
certain information must be present to allow the contract object representation
to be useful (`source`/`bytecode`/etc. enable the deployment of new instances,
`networks` listed with prior contract instance `address`es enable interaction
with deployed contracts on-chain)


## References

<a name="footnote-1">1.</a> JSON Schema [http://json-schema.org](http://json-schema.org/)

<a name="footnote-2">2.</a> Ethereum Contract JSON ABI [https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI#json](https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI#json)



## Properties


### `contractName`

| type | _string_ matching pattern `^[a-zA-Z_][a-zA-Z0-9_]*$` |
| ---: | ---- |
| default | `"Contract"` |


Name used to identify the contract. Semi-alphanumeric string.


### `abi`

| type | _array_ |
| ---: | ---- |
| JSON Schema | [abi.spec.json](spec/abi.spec.json) |
| **required** |


External programmatic description of contract's interface. The contract's ABI
determines the means by which applications may interact with individual contract
instances. Array of functions and events representing valid inputs and outputs
for the instance.


### `metadata`

| type | _string_ |
| ---: | ---- |


Contract metadata. Stringified JSON.



### `bytecode`

| type | _string_ matching pattern `^0x0$\|^0x([a-fA-F0-9]{2}\|__.{38})+$` |
| ---: | ---- |
| ref | [Bytecode](#contract-object--bytecode) |


EVM instruction bytecode that runs as part of contract create transaction.
Constructor code for new contract instance.
Specified as a hexadecimal string, may include `__`-prefixed (double underscore)
link references.


### `deployedBytecode`

| type | _string_ matching pattern `^0x0$\|^0x([a-fA-F0-9]{2}\|__.{38})+$` |
| ---: | ---- |
| ref | [Bytecode](#contract-object--bytecode) |


EVM instruction bytecode associated with contract that specifies behavior for
incoming transactions/messages. Underlying implementation of ABI.
Specified as a hexadecimal string, may include `__`-prefixed (double underscore)
link references.


### `sourceMap`

| type | _string_ matching pattern `^[0-9;]*` |
| ---: | ---- |


Source mapping for `bytecode`, pairing contract creation transaction data bytes
with origin statements in uncompiled `source`.


### `deployedSourceMap`

| type | _string_ matching pattern `^[0-9;]*` |
| ---: | ---- |


Source mapping for `deployedBytecode`, pairing contract program data bytes
with origin statements in uncompiled `source`.


### `source`

| type | _string_ |
| ---: | ---- |


Uncompiled source code for contract. Text string.


### `sourcePath`

| type | _string_ |
| ---: | ---- |


File path for uncompiled source code.


### `ast`

| type | _object_ |
| ---: | ---- |


_format not included in current version of this specification_

Abstract Syntax Tree. A nested JSON object representation of contract source
code, as output by compiler.


### `legacyAST`

| type | _object_ |
| ---: | ---- |


_format not included in current version of this specification_

Legacy Abstract Syntax Tree. A nested JSON object representation of contract source
code, as output by compiler.


### `compiler`

| type | _object_ |
| ---: | ---- |


Compiler information.


### `name`

| type | string |
| ---: | ---- |


Name of the compiler used.


### `version`

| type | string |
| ---: | ---- |


Version of the compiler used.


### `networks`

| type | _object_ |
| ---: | ---- |


Listing of contract instances. Object mapping network ID keys to network object
values. Includes address information, links to other contract instances, and/or
contract event logs.


#### Properties (key matching `^[a-zA-Z0-9]+$`)

| type | _object_ |
| ---: | ---- |
| ref | [Network Object](network-object.spec.md) |


### `schemaVersion`

| type | _string_ matching pattern `[0-9]+\.[0-9]+\.[0-9]+` |
| ---: | ---- |


Version of this schema used by contract object representation.


### `updatedAt`

| type | _string_ |
| ---: | ---- |
| format | IS0-8601 Datetime |


Time at which contract object representation was generated/most recently
updated.


### `networkType`

| type | string |
| ---: | ---- |
| default | `"ethereum"` |


Specific blockchain network type targeted.


### `devdoc`

| type | string |
| ---: | ---- |


NatSpec developer documentation of the contract.


### `userdoc`

| type | string |
| ---: | ---- |


NatSpec user documentation of the contract.


## Custom Properties

### `^x-([a-zA-Z]+-)*[a-zA-Z]+`

| type | _string or number or object or array_ |
| ---: | ---- |


Objects following this schema may include additional properties with
`x-`-prefixed keys.


## Definitions


### <a name="contract-object--bytecode">Bytecode</a>

| type | _string_ matching pattern `^0x0$\|^0x([a-fA-F0-9]{2}\|__.{38})+$` |
| ---: | ---- |


`0x`-prefixed string representing compiled EVM machine language.

This string representation may indicate link references in place of
linked instance addresses. Link references must begin with `__` and be exactly
40 characters long (i.e., string length of an address in hexadecimal).
