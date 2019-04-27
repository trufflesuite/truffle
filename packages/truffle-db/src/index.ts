require("source-map-support/register");
require("module-alias/register");
const path = require("path");
const moduleAlias = require("module-alias");

moduleAlias.addAlias("truffle-db", path.join(__dirname));

const { TruffleDB } = require("./db");

export { TruffleDB };
