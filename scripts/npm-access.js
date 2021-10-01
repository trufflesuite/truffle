const { execSync } = require("child_process");

const getPkgPermissions = userOrOrg => {
  const bufferResponse = execSync(`npm access ls-packages ${userOrOrg}`);
  const stringResponse = bufferResponse.toString();
  return JSON.parse(stringResponse);
};

const getMonorepoPackages = () => {
  const pkgs = execSync('lerna ls')
    .toString()
    .split("\n")
    .filter(ln => !/^lerna/.test(ln));
  return new Set(pkgs);
}

const orgs = ["truffle"];

for (let org of orgs) {
  const permissions = getPkgPermissions(org);

  const getNpmUsername = () => {
    const bufferResponse = execSync("npm whoami");
    return bufferResponse.toString();
  };

  const username = getNpmUsername();

  const userPermissionsObject = getPkgPermissions(username);
  const monoPkgs = getMonorepoPackages();

  for (const pkg in permissions) {
    // skip perm checks if package not in monorepo
    if (!monoPkgs.has(pkg)) {
      continue
    }

    if (!userPermissionsObject[pkg])
      throw new Error(`You don't have permissions to publish ${pkg}`);
    if (permissions[pkg] !== userPermissionsObject[pkg])
      throw new Error(`Missing correct 'read-write' access to ${pkg}`);
  }
}
