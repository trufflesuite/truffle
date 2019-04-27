## Truffle URL resolver engine

## Note - made for Remix IDE by Remix Team, added to work with Truffle

`resolve(url, urlHandler)`

Returns `json` object with exact same path as `import` statement.

**Output**
```json
{
	content: 'pragma solidity ^0.5.0;\nimport "./mortal.sol";\n\ncontract Greeter is Mortal {\n    /* Define variable greeting of the type string */\n    string greeting;\n\n    /* This runs when the contract is executed */\n    constructor(string memory _greeting) public {\n        greeting = _greeting;\n    }\n\n    /* Main function */\n    function greet() public view returns (string memory) {\n        return greeting;\n    }\n}\n',
	cleanURL: '../greeter.sol',
	type: 'local'
}
```

#### Usage

`resolve(url, urlHandler)` function should be called from within `handleImportCb` function of `solc.compile(input, handleImportCb)`.

```ts
import { TruffleURLResolver } from 'truffle-url-resolver'

const urlResolver = new TruffleURLResolver()
const fileName: string = '../greeter.sol'
urlResolver.resolve(fileName, urlHandler)
	.then((sources: object) => {
		console.log(sources)
	})
	.catch((e: Error) => {
		throw e
	})
```

#### References

* [TypeScript Publishing](http://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
* [DefinitelyTyped 'Create a new package' guide](https://github.com/DefinitelyTyped/DefinitelyTyped#create-a-new-package)
* [Remix-url-resolver](https://github.com/ethereum/remix/tree/master/remix-url-resolver)