# `truffle-external-compile`

Package to enable Truffle to run arbitrary commands as part of compilation.

## Configuration

In your Truffle config (`truffle-config.js`):

```javascript
module.exports = {
  compilers: {
    external: {
      command: "<compilation-command>",
      targets: [{
        path: "<relative/globbed/path/to/outputs/*.output>",
        command: "<artifact-generation-command>"
      }]
    }
  }
}
```
