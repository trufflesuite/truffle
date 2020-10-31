const Config = require("@truffle/config");
const expect = require("@truffle/expect");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");

function prepareConfig(options) {
  expect.options(options, ["contracts_build_directory"]);

  expect.one(options, ["contracts_directory", "files"]);

  // Use a config object to ensure we get the default sources.
  const config = Config.default().merge(options);

  config.compilersInfo = {};

  if (!config.resolver) config.resolver = new Resolver(config);

  if (!config.artifactor) {
    config.artifactor = new Artifactor(config.contracts_build_directory);
  }

  return config;
}

function multiPromisify(func) {
  return (...args) =>
    new Promise((accept, reject) => {
      const callback = (err, ...results) => {
        if (err) reject(err);

        accept(results);
      };

      func(...args, callback);
    });
}

// warning: this function is a HACK
// post-condition: mutates artifacts
//
// also, this queries @truffle/db explicitly - this would be better reworked
// inside db to return pre-correlated data
async function correlateContracts(
  db,
  artifacts,
  contracts
) {
  const query = `
    query contracts($ids: [ID!]!) {
      contracts(filter: { ids: $ids }) {
        id
        name
      }
    }
  `;

  const result = await db.query(query, {
    ids: contracts.map(({ id }) => id)
  });

  const byName = result.data.contracts
    .map(({ name, id }) => ({ [name]: { id } }))
    .reduce((a, b) => ({ ...a, ...b }));

  for (const artifact of artifacts) {
    console.debug("artifact %o", artifact.contract_name);

    const contract = byName[artifact.contract_name];

    artifact["db:contract"] = contract;
  }
}

module.exports = {
  prepareConfig,
  multiPromisify,
  correlateContracts
};
