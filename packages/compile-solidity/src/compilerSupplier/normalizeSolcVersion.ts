/**
 * Convert a full version string (possibly with commit information, etc.) into
 * a canonical short-form semver version (x.y.z)
 */
export const normalizeSolcVersion = (input: string | Buffer): string => {
  const version = String(input);
  return version.split(":")[1].trim();
};
