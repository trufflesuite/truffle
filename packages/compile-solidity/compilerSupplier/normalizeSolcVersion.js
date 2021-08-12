/**
 * Convert a full version string (possibly with commit information, etc.) into
 * a canonical short-form semver version (x.y.z)
 */
const normalizeSolcVersion = (input) => {
  const version = String(input);
  return version.split(":")[1].trim();
};

module.exports = { normalizeSolcVersion };
