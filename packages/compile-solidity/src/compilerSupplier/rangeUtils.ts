import path from "path";
import fs from "fs-extra";
import semver from "semver";
import { Native } from "./loadingStrategies/Native";
import { Local } from "./loadingStrategies/Local";
import * as defaults from "./defaults";

export const RangeUtils = {
  //takes a version string which may be native or local, and resolves
  //it to one which is (presumably) either a version or a version range
  resolveToRange: async function (version) {
    if (!version) {
      return defaults.solcVersion;
    }
    //if version was native or local, must determine what version that
    //actually corresponds to
    if (version === "native") {
      return (await new Native().load()).solc.version();
    } else if (fs.existsSync(version) && path.isAbsolute(version)) {
      return (await new Local().load(version)).solc.version();
    }
    return version;
  },

  //parameter range may be either an individual version or a range
  rangeContainsAtLeast: function (range, comparisonVersion) {
    //the following line works with prereleases
    const individualAtLeast =
      semver.valid(range, { loose: true }) &&
      semver.gte(range, comparisonVersion, {
        includePrerelease: true,
        loose: true
      });
    //the following line doesn't, despite the flag, but does work with version ranges
    const rangeAtLeast =
      semver.validRange(range, { loose: true }) &&
      !semver.gtr(comparisonVersion, range, {
        includePrerelease: true,
        loose: true
      }); //intersects will throw if given undefined so must ward against
    return individualAtLeast || rangeAtLeast;
  },

  //parameter version may be either an individual version or a range
  //first case is there to handle ranges, second to handle anything else
  coerce: function (version) {
    return (
      semver.validRange(version, { loose: true }) ||
      semver.coerce(version, { loose: true })?.toString()
    );
  }
};
