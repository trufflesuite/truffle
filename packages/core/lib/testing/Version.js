const semver = require("semver");
const CompilerSupplier = require("@truffle/compile-solidity/compilerSupplier/");
const Native = require("@truffle/compile-solidity/compilerSupplier/loadingStrategies/Native");
const Local = require("@truffle/compile-solidity/compilerSupplier/loadingStrategies/Local");
const path = require("path");
const fs = require("fs-extra");

const Version = {
  //takes a version string which may be native or local, and resolves
  //it to one which is (presumably) either a version or a version range
  resolveVersionString: function (version) {
    if (!version) {
      return CompilerSupplier.getDefaultVersion();
    }
    //if version was native or local, must determine what version that
    //actually corresponds to
    if (version === "native") {
      return new Native().load().version();
    } else if (fs.existsSync(version) && path.isAbsolute(version)) {
      return new Local({ version }).load().version();
    }
    return version;
  },

  //please pass in a resolved version only
  //(may be an individual version or a range)
  versionIsAtLeast: function (version, comparisonVersion) {
    //the following line works with prereleases
    const individualAtLeast = semver.gte(version, comparisonVersion, {
      includePrerelease: true,
      loose: true
    });
    //the following line doesn't, despite the flag, but does work with version ranges
    const rangeAtLeast =
      semver.validRange(version) &&
      !semver.ltr(comparisonVersion, version, {
        includePrerelease: true,
        loose: true
      }); //intersects will throw if given undefined so must ward against
    return individualAtLeast || rangeAtLeast;
  },

  //please pass in a resolved version only
  coerce: function (version) {
    return semver.validRange(version) || semver.coerce(version).toString();
  }
};

module.exports = Version;
