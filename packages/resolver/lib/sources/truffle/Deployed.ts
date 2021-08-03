const web3Utils = require("web3-utils");
import semver from "semver";
import RangeUtils from "@truffle/compile-solidity/dist/compilerSupplier/rangeUtils";

type solcOptionsArg = {
  solc: { version: string };
};

export class Deployed {
  static makeSolidityDeployedAddressesLibrary(
    mapping: { [key: string]: string | false },
    { solc: { version } }: solcOptionsArg
  ): string {
    let source = "";
    source +=
      "//SPDX-License-Identifier: MIT\n" +
      "pragma solidity >= 0.4.15 < 0.9.0; \n\n library DeployedAddresses {" +
      "\n";

    for (let [name, address] of Object.entries(mapping)) {
      let body = "revert();";

      if (address) {
        address = Deployed.toChecksumAddress(address);

        body = "return payable(" + address + ");";
      }

      source +=
        "  function " +
        name +
        "() public pure returns (address payable) { " +
        body +
        " }";
      source += "\n";
    }

    source += "}";

    version = RangeUtils.resolveToRange(version);
    if (!RangeUtils.rangeContainsAtLeast(version, "0.5.0")) {
      //remove "payable"s in types if we're before 0.5.0
      source = source.replace(/address payable/g, "address");
    }
    if (!RangeUtils.rangeContainsAtLeast(version, "0.6.0")) {
      //remove "payable"s in conversions if we're before 0.6.0
      source = source.replace(/payable\((.*)\)/g, "$1");
    }

    return source;
  }

  // Pulled from ethereumjs-util, but I don't want all its dependencies at the moment.
  static toChecksumAddress(address: string): string {
    address = address.toLowerCase().replace("0x", "");
    const hash = web3Utils.sha3(address).replace("0x", "");
    var ret = "0x";

    for (var i = 0; i < address.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        ret += address[i].toUpperCase();
      } else {
        ret += address[i];
      }
    }

    return ret;
  }
}
