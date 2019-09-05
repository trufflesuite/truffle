# Truffle Contract Decoder
This module provides interfaces for decoding contract state and events.

## Usage
```
import TruffleContractDecoder from 'truffle-decoder';

const contractDecoder = TruffleContractDecoder.forContract(
  contract: ContractObject,
  relevantContracts: ContractObject[],
  provider: Provider,
  address?: string
);

await contractDecoder.init();
```

If address is not provided, it will be autodetected on init if possible; pass
an explicit address to override this.

Both `forContract` and `init` can throw various errors; be prepared for this.

## Types

### BlockNumber
`number | "latest" | "genesis" | "pending"`

### TruffleContractDecoder
An instance of this `class` represents a decoder for a `TruffleContract` deployed instance.

#### Methods

##### state
`contractDecoder.state(block: BlockNumber = "latest"): Promise<Interface ContractState>`

Returns the state of the contract, including decoded variables.

##### variable
`contractDecoder.variable(variable: string | number, block: BlockNumber = "latest"): Promise<Interface DecodedVariable>`

Decodes a single variable.  Variable can be provided by name or by ID.

##### events
`contractDecoder.events(name: string | null = null, block: BlockNumber = "latest"): Promise<Interface ContractEvent[]>`

##### onEvent
`contractDecoder.onEvent(name: string, callback: Function(event: ContractEvent, callback: Function(err: Error | falsy = null)))`

#### watchMappingKey

Used to register mapping keys so that decoded mappings will include them.

#### unwatchMappingKey

Used to unregister mapping keys so that decoded mappings will not include them.

### ContractState

### ContractEvent
