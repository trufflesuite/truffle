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

- `modifiers`

  An object that describes two things:

  - Prompts: Questions presented in an interactive menu, in which user creates a 'recipe key' by answering the questions).
  - Recipes: Mapping from 'recipe key' to a set of files which make up the recipe.

  Example:

  ```json
  "modifiers": {
    // Prompts for user to answer.
    "prompts": [
      // Prompts follow inquirer.Questions format (from SBoudrias/Inquirer.js).
      // Prompt 1
      {
        "type": "list",
        "message": "Select a framework",
        "name": "framework",
        "choices": [
          { "name": "React", "checked": true },
          { "name": "Vue" }
        ]
      },
      // Prompt 2
      {
        "type": "list",
        "message": "TypeScript or JavaScript?",
        "name": "package",
        "choices": [
          { "name": "TypeScript", "checked": true },
          { "name": "JavaScript" }
        ]
      }
    ],

    // Files to be included in all recipes.
    "recipe-common": [
      "file-common-to-all-recipes-0.txt",
      "file-common-to-all-recipes-1.txt",
      "foo/nested-file-common-to-all-recipes.txt"
    ],

    // Recipe specs mapping.
    // Mapping keys are prompt answers joined by "-",
    // mapping values are lists of files specific to that recipe.
    // A file can be represented as a string, or an object with `from` and `to` properties, which moves / renames the file.
    "recipes": {
      "React-TypeScript": [
        "foo.ts",
        "tsconfig.json",
        { "from": "react-ts/package.json", "to": "package.json" },
        { "from": "react-ts/src/some-react-ts-file.tsx", "to": "src/App.tsx" }
      ],
      "React-JavaScript": [
        "foo.js",
        { "from": "react-js/package.json", "to": "package.json" },
        { "from": "react-js/src/some-react-js-file.jsx", "to": "src/App.jsx" }
      ],
      "Vue-TypeScript": [
        "foo.ts",
        "tsconfig.json",
        { "from": "vue-ts/package.json", "to": "package.json" },
        { "from": "vue-ts/src/some-vue-ts-file.vue", "to": "src/App.vue" }
      ],
      "Vue-JavaScript": [
        "foo.js",
        { "from": "vue-js/package.json", "to": "package.json" },
        { "from": "vue-js/src/some-vue-js-file.vue", "to": "src/App.vue" }
      ]
    }
  }
  ```

## Available Unbox Hooks

- `post-unpack`

  If provided, runs command after box files are fetched and cleaned up for a
  new project.

  Commonly useful to install dependencies, e.g.
