const path = require("path");
const moduleAlias = require("module-alias");
moduleAlias.addAlias("truffle-db", path.join(__dirname));

require("source-map-support/register");

const { TruffleDB } = require("./db");

export { TruffleDB };
