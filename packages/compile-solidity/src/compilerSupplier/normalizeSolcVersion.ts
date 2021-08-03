export const normalizeSolcVersion = (input) => {
  const version = String(input);
  return version.split(":")[1].trim();
};
