# @truffle/box

Truffle Box management functionality.

Handles behavior for unboxing a new project from a predefined Truffle Box.

### Usage

```javascript
const TruffleBox = require("@truffle/box");

// `@truffle/box` prompts when unboxing into non-empty directories & before potential overwrites
// a `force` option can be passed to force unboxing. default is false
const unboxOptions = { force: false };

// .unbox() validates & unboxes truffle box repos
// pass the current working directory as directory to unbox into
TruffleBox.unbox(
  "https://github.com/trufflesuite/truffle-init-default",
  process.cwd(),
  unboxOptions
);

// or specify relative path to unbox into (path must already exist)
TruffleBox.unbox(
  "https://github.com/trufflesuite/truffle-init-default",
  "some/relativePath",
  unboxOptions
);
```

## Box Configuration

Truffle Boxes are configured via a required `truffle-box.json` file in the
box repo's root directory.

This box configuration file specifies an object containing the following
properties:

- `ignore`

  A list of relative paths to files that should be removed upon box unpack.
  Useful to remove box READMEs or other artifacts that pertain to box but not
  the set-up Truffle project.

  Example:

  ```json
  "ignore": [
    "README.md",
    ".gitignore"
  ]
  ```

- `commands`

  An object mapping supported behaviors for project to invoked command strings.

  `truffle unbox` prints commands to screen upon unboxing for documentation
  purposes.

  Example:

  ```json
  "commands": {
    "compile": "truffle compile",
    "migrate": "truffle migrate",
    "test": "truffle test"
  }
  ```

- `hooks`

  An object to specify commands to run at particular steps in the unbox
  process. Maps strings identifying individual hooks to command strings.

  Example:

  ```json
  "hooks": {
    "post-unpack": "npm install"
  }
  ```

- `recipes`

  An object that describes box recipes, which are variations of a given box. It has three properties:

  - `prompts`
    Array of questions to prompt the user. Each prompt is an object with the following properties:

    - `message`
      Prompt text to print.
    - `default`
      (optional) Default answer to prompt.

  - `common`
    Array of files (relative paths) that belong to every recipe.

  - `specs`
    An object that maps prompt answers to arrays of files specific to a recipe. A file can be a:

    - string: Relative path.
    - object: An object with `from` and `to` string properties, which are relative paths, representing a move/rename operation.

    A given answer's depth, _d_, corresponds to the prompt at index _d_. (See example.)

  Example for a box with three recipes:

  ```txt
                          │
         Prompt 1         │      Prompt 2
  Select an Ethereum lib. │      TS or JS?
                          │

                  ┌────────────> TypeScript
                  │      (web3.js,TypeScript recipe)
        web3.js ──┤
                  └────────────> JavaScript
                         (web3.js,JavaScript recipe)

                          │
        ethers.js         │
    (ethers.js recipe)    │
                          │
  ```

  ```json
  "recipes": {
    "prompts": [
      { "message": "Select an Ethereum lib." },
      {
        "message": "TS or JS?",
        "default": "TypeScript"
      }
    ],
    "common": [ "welcome-to-ethereum.md" ],
    "specs": {
      "web3.js": {
        "TypeScript": [
          "tsconfig.json",
          { "from": "tutorials/web3js-ts/package.json", "to": "package.json" },
          { "from": "tutorials/web3js-ts/index.ts", "to": "tutorial.ts" }
        ],
        "JavaScript": [
          { "from": "tutorials/web3js-js/package.json", "to": "package.json" },
          { "from": "tutorials/web3js-js/index.js", "to": "tutorial.js" }
        ]
      },
      "ethers.js": [
        { "from": "tutorials/ethersjs/package.json", "to": "package.json" },
        { "from": "tutorials/ethersjs/index.js", "to": "tutorial.js" }
      ]
    }
  }
  ```

## Available Unbox Hooks

- `post-unpack`

  If provided, runs command after box files are fetched, cleaned up, modified according to recipe (if any) for a
  new project.

  Commonly useful to install dependencies, e.g.
