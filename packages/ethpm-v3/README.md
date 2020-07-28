# `ethpm-v3`

> TODO: description

## Usage

```
const ethpmV3 = require('ethpm-v3');
```

TODO:
audit all error messages / include useful links to cli/docs/etc...
useful comments throughout
test all the different install scenarios
- test auto semver detect
warnings about trusting packages?
ethpm-v1 tests
truffle-config: ethpm/registry/network_id -> networkId
should the network provider be a function? or instance?
install from github blob uri

is there a better display output workflow for sending publish tx
do we want timeout errors? // what's the best pattern to catch errors? 

how many deployments/chain does truffle support? if we migrate will it replace a deployment? (probably yes)

there are no contractTypes in compilers from ethpm.js

warning if ppl installed a package with insufficient artifacts - but expect them via deploy?

- should we require `name` and `version` in ethpm.json?

QUESTIONS:
do we support ens in truffle config for the registry address?
should the network provider be a function? or instance?
truffle default registry?

# questions
- how to install `ethpm` npm package as different versions for `ethpm-v1` / `ethpm-v3`
- can we enforce either v1 / v3 per project? combining manifests seems tricky..
	- should we have a v1 and v3 resolver?

todo: resolver source for both ethpmv1 & v3


```
truffle packages
````
todo: test with big registry
todo: test with no registry
todo: test with invalid registry

```
truffle install xxx@1.0.0
truffle install ethpm://packages.eth:3/xxx@1.0.0
truffle install ipfs://Qmasdfa --alias=awesome
```

- supports either v1 or v3

```
truffle publish
````

settings required in `ethpm.json`



escrow: QmNpLojZo471M357NTUZ1qKDwjUZrfYctWhzPtNFEXcSaL
piper-coin: QmNbvXM5ig6Qtz6abRuG52KgjFqfXDyBCdRTz7QDENgxzv
owned: QmcxvhkJJVpbxEAa6cgW3B6XwPJb79w9GpNUv2P2THUzZR
safe-math-lib: QmWnPsiS3Xb8GvCDEBFnnKs8Yk4HaAX6rCqJAaQXGbCoPk
standard-token: QmQNffBrmbB3TuBCtYfYsJWJVLssatWXa3H6CkGeyNUySA
transferable: QmYX2yqyrpaJQugHQKnaWYcnkJEdnJC4exKaEVR3RK3TTf
wallet-with-send: QmX95FoLeVAFbnbj1PEDQaXDAeccmjbK8Zbw4eos9PAxeA
wallet: QmPtZxv9uEtr671XVjevHDacP9M4Tw9T7p6n1MS1xdyMeC


ICEBOX:
support github uris
deploy a registry?
