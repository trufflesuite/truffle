export const getTruffleDb = () => {
  try {
    return require("@truffle/db");
  } catch {
    return null;
  }
};
