# `truffle-external-compile`

Package to enable Truffle to run arbitrary commands as part of compilation.

## Configuration

In your Truffle config (`truffle.js`):

```javascript
module.exports = {
  compilers: {
    external: {
      command: "<command-to-run>",
      targets: [{
        path: "relative/globbed/path/to/artifacts/*.json"
      }]
    }
  }
}
```
