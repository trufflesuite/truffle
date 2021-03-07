import semver from "semver";

export const conditionalDescribe = (condition: boolean) =>
  condition ? describe : describe.skip;
export const conditionalIt = (condition: boolean) => (condition ? it : it.skip);

export const describeForNode12 = conditionalDescribe(
  semver.satisfies(process.version, ">=12")
);
