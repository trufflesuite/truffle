export const getDb = () => {
  try {
    return require("@truffle/db");
  } catch {
    return null;
  }
};
