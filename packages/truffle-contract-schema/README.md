# truffle-contract-schema
JSON schema for contract artifacts

# Schema

The schema, which includes a JSON schema validator, needs to be created and fleshed out with strict documentation. However, in light of that effort, a loose schema is defined below:

```
{
  "contract_name": ...,
  "abi": ...,
  "unlinked_binary": ...,
  "network_id": ...,
  "address": ...,
  "links": ...,
  "events": ...,
  "default_network": ...,
  "networks": ...
}
```

* `contract_name`: `string`, optional: Name of the contract that will be used to identify this contract. Defaults to `Contract`.
* `abi`: `array`, required; array returned by the Solidity compiler after compilation of a Solidity source file.
* `unlinked_binary`: `string`, required: hexadecimal bytecode string of a Solidity contract returned by the Solidity compiler, without libraries linked.
* `network_id`: `string` or `number`, optional: A string or number that represents the id of the network these contract artifacts apply to. If none specified, will default to `"*"`, which signifies these artifacts apply to the "wildcard network", which is useful in some circumstances.
* `address`: `string`, optional; the default address associated with this contract on the network specified by `network_id`.
* `links`: `object`, optional: A set of key/value pairs that link contract names that exist within the `unlinked_binary` to their specified addresses on the network specified by network_id.
* `events`: `object`, optional: Log topic/event abi pairs that represent logs that can be thrown. This object may describe logs and events that exist outside of the current contract so that this object will be able to parse those events correctly.
* `default_network`: `string` or `number`: The default network to be used when this object is instantiated via [truffle-contract](https://github.com/trufflesuite/truffle-contract).
* `networks: `object`, optional: key/value pairs of network ids and their associated network objects. Each network object may contain the `address`, `links` and `events` objects described above, containing data that's specific to addresses on each network.


# Testing

This package is the result of breaking up EtherPudding into multiple modules. Tests currently reside within [truffle-artifactor](https://github.com/trufflesuite/truffle-artifactor) but will soon move here.
