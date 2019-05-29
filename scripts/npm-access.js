const { execSync } = require("child_process");

const getPkgPermissions = userOrOrg => {
  const bufferResponse = execSync(`npm access ls-packages ${userOrOrg}`);
  const stringResponse = bufferResponse.toString();
  return JSON.parse(stringResponse);
};

const truffleSuiteOrgPermissionsObject = getPkgPermissions("trufflesuite");

const getNpmUsername = () => {
  const bufferResponse = execSync("npm whoami");
  return bufferResponse.toString();
};

const username = getNpmUsername();

const userPermissionsObject = getPkgPermissions(username);

for (const pkg in truffleSuiteOrgPermissionsObject) {
  if (!userPermissionsObject[pkg])
    throw new Error(`You don't have permissions to publish ${pkg}`);
  if (truffleSuiteOrgPermissionsObject[pkg] !== userPermissionsObject[pkg])
    throw new Error(`Missing correct 'read-write' access to ${pkg}`);
}
