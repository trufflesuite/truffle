# Truffle Contract Decoder
This module provides interfaces for decoding contract state and events.

## Usage
```
import decoder from 'truffle-contract-decoder';

const contractDecoder = await decoder.for(instance: TruffleContract);
```

## Types

### BlockNumber
`number | "latest"`

### ContractDecoder
An instance of this `class` represents a decoder for a `TruffleContract` deployed instance.

#### Methods

##### state
`contractDecoder.state(block: BlockNumber = "latest"): Promise<Interface ContractState>`

##### variable
`contractDecoder.variable(variable: string, block: BlockNumber = "latest"): Promise<Interface DecodedVariable>`

##### events
`contractDecoder.events(name: string | null = null, block: BlockNumber = "latest"): Promise<Interface ContractEvent[]>`

##### onEvent
`contractDecoder.onEvent(name: string, callback: Function(event: ContractEvent, callback: Function(err: Error | falsy = null)))`

### ContractState

### DecodedVariable

### ContractEvent
