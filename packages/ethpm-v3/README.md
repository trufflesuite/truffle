# truffle/ethpm-v3

A package that provides truffle support for [ethpm v3](http://ethpm.github.io/ethpm-spec/v3-package-spec.html), the default version in truffle.

## Usage
Installing an ethpm package in your truffle project will automatically generate an `_ethpm_packages/` directory to which the package assets will be written. This directory should be treated like a `node_modules/` directory, and not be edited directly.

## Configuration
To configure ethpm, define the following fields inside your `truffle-config.js`.

```js
{
  // required to lookup a registry address via ens
  ens: {
    enabled: true    
  },
  // below are all of the default config values for ethpm
  ethpm: {
    ipfsHost: "ipfs.infura.io",
    ipfsProtocol: "https",
    ipfsPort: "5001",
    registry: {
      address: "0xabc", // ENS is supported here
      network: "ropsten" // must match a network with an available provider defined in `networks` field
    }
    version: "3" // only supported versions include ("1", "3")
  }
}
```

## List
```
truffle packages
```
Reads all directly available packages on the connected registry.

## Install

### Install the latest version of a package from connected registry
```
truffle install owned
```
- Will throw an error requiring a specified version if package versioning does not follow semver.


### Install a specific version of a package from connected registry
```
truffle install owned@1.0.0
```

### Install the latest version of a package from any registry
```
truffle install owned ethpm://0x123/owned
truffle install owned ethpm://0x123:1/owned
```
- will throw an error requiring a specified version if package versioning does not follow semver.
- using an ethpm uri overrides the registry set in `truffle-config.js`

### Install a specific version of a package from any registry
```
truffle install owned ethpm://0x123/owned@1.0.0
truffle install owned ethpm://0x123:1/owned@1.0.0
```
```
truffle install owned ethpm://libraries.snakecharemers.eth/owned@1.0.0
truffle install owned ethpm://libraries.snakecharemers.eth:1/owned@1.0.0
```

### Install a package under an alias
```
truffle install owned@1.0.0 --alias owned-2
```
- This can be useful for installing multiple packages that have the same name (installed packages share a namespace).
- This can be useful for adding custom identifiers to installed packages for whatever reason.

## Publish
```
truffle publish
```

- Requires that a valid `ethpm.json` file exists in your project root directory.
- Requires that provider for connected registry has release privileges on that registry.
- Running `truffle publish` will automatically generate an ethpm manifest from available contract assets and publish it to the connected registry.

#### Sample `ethpm.json`
```jsonld=
{
    "name": "package-name", // required
    "version": "0.1.0", // required
    "meta": {
        "license": "licenseType",
        "authors": ["author-1", "author-2"],
        "description": "Description of package.",
        "keywords": ["keyword1", "keyword2"],
        "links": {
            "documentation": "www.documentation.com",
            "repo": "www.repository.com",
            "website": "www.website.com"
        }
    }
}
```

