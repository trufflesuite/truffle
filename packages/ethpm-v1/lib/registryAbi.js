const abi = [
  {
    constant: true,
    inputs: [],
    name: "getNumReleases",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "newReleaseValidator", type: "address" }],
    name: "setReleaseValidator",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "name", type: "string" },
      { name: "offset", type: "uint256" },
      { name: "numReleases", type: "uint256" }
    ],
    name: "getPackageReleaseHashes",
    outputs: [{ name: "", type: "bytes32[]" }],
    payable: false,
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "newOwner", type: "address" }],
    name: "setOwner",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "name", type: "string" },
      { name: "major", type: "uint32" },
      { name: "minor", type: "uint32" },
      { name: "patch", type: "uint32" },
      { name: "preRelease", type: "string" },
      { name: "build", type: "string" }
    ],
    name: "getReleaseLockfileURI",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getPackageDb",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "newPackageDb", type: "address" }],
    name: "setPackageDb",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "name", type: "string" },
      { name: "major", type: "uint32" },
      { name: "minor", type: "uint32" },
      { name: "patch", type: "uint32" },
      { name: "preRelease", type: "string" },
      { name: "build", type: "string" }
    ],
    name: "releaseExists",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getReleaseValidator",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "releaseHash", type: "bytes32" }],
    name: "getReleaseData",
    outputs: [
      { name: "major", type: "uint32" },
      { name: "minor", type: "uint32" },
      { name: "patch", type: "uint32" },
      { name: "preRelease", type: "string" },
      { name: "build", type: "string" },
      { name: "releaseLockfileURI", type: "string" },
      { name: "createdAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" }
    ],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getAllReleaseHashes",
    outputs: [{ name: "", type: "bytes32[]" }],
    payable: false,
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "name", type: "string" },
      { name: "newPackageOwner", type: "address" }
    ],
    name: "transferPackageOwner",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "idx", type: "uint256" }],
    name: "getReleaseHash",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "name", type: "string" },
      { name: "major", type: "uint32" },
      { name: "minor", type: "uint32" },
      { name: "patch", type: "uint32" },
      { name: "preRelease", type: "string" },
      { name: "build", type: "string" },
      { name: "releaseLockfileURI", type: "string" }
    ],
    name: "release",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getNumPackages",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "numReleases", type: "uint256" }
    ],
    name: "getReleaseHashes",
    outputs: [{ name: "", type: "bytes32[]" }],
    payable: false,
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "newAuthority", type: "address" }],
    name: "setAuthority",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "name", type: "string" }],
    name: "packageExists",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "authority",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "name", type: "string" }],
    name: "getPackageData",
    outputs: [
      { name: "packageOwner", type: "address" },
      { name: "createdAt", type: "uint256" },
      { name: "numReleases", type: "uint256" },
      { name: "updatedAt", type: "uint256" }
    ],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "name", type: "string" }],
    name: "getAllPackageReleaseHashes",
    outputs: [{ name: "", type: "bytes32[]" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "name", type: "string" },
      { name: "releaseIdx", type: "uint256" }
    ],
    name: "getReleaseHashForPackage",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "idx", type: "uint256" }],
    name: "getPackageName",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "newReleaseDb", type: "address" }],
    name: "setReleaseDb",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "getReleaseDb",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nameHash", type: "bytes32" },
      { indexed: true, name: "releaseHash", type: "bytes32" }
    ],
    name: "PackageRelease",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "oldOwner", type: "address" },
      { indexed: true, name: "newOwner", type: "address" }
    ],
    name: "PackageTransfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "oldOwner", type: "address" },
      { indexed: true, name: "newOwner", type: "address" }
    ],
    name: "OwnerUpdate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "oldAuthority", type: "address" },
      { indexed: true, name: "newAuthority", type: "address" }
    ],
    name: "AuthorityUpdate",
    type: "event"
  }
];

module.exports = { abi };
